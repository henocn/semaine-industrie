'use strict';

const env = require('../../config/env');
const logger = require('../../utils/logger');

const UPSTREAM_TIMEOUT_MS = 120000;

/* Appelle Dify en continu. La clé d'API reste sur le serveur. */
function callDify({ query, conversationId, visitorId, signal }) {
  return fetch(`${env.DIFY_API_URL.replace(/\/$/, '')}/chat-messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {},
      query,
      user: `site-${visitorId}`,
      conversation_id: conversationId || '',
      response_mode: 'streaming',
    }),
    signal,
  });
}

/* Transmet à l'appelant seulement le texte et l'identifiant de conversation, jamais les sources de Dify. */
function forwardEvent(raw, emit) {
  const data = raw.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('');
  if (!data) return;
  let event;
  try {
    event = JSON.parse(data);
  } catch {
    return;
  }
  if ((event.event === 'message' || event.event === 'agent_message') && event.answer) {
    emit({ type: 'delta', text: event.answer, conversation_id: event.conversation_id });
  } else if (event.event === 'message_replace') {
    emit({ type: 'replace', text: event.answer });
  } else if (event.event === 'message_end') {
    emit({ type: 'end', conversation_id: event.conversation_id });
  } else if (event.event === 'error') {
    logger.warn('[chatbot] erreur Dify', event.status, event.code);
    emit({ type: 'error' });
  }
}

/* Pose une question et relaie la réponse morceau par morceau. */
async function streamAnswer({ query, conversationId, visitorId, signal: clientSignal, emit }) {
  if (!env.DIFY_API_KEY) {
    logger.warn('[chatbot] DIFY_API_KEY non configurée');
    emit({ type: 'error' });
    return;
  }
  const signal = AbortSignal.any([clientSignal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]);
  let upstream = await callDify({ query, conversationId, visitorId, signal });
  /* Une conversation expirée ne doit pas bloquer le visiteur : on en démarre une nouvelle. */
  if (upstream.status === 404 && conversationId) {
    emit({ type: 'reset' });
    upstream = await callDify({ query, conversationId: null, visitorId, signal });
  }
  if (!upstream.ok || !upstream.body) {
    logger.warn('[chatbot] Dify a répondu', upstream.status);
    emit({ type: 'error' });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of upstream.body) {
    buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, '\n');
    let end = buffer.indexOf('\n\n');
    while (end >= 0) {
      forwardEvent(buffer.slice(0, end), emit);
      buffer = buffer.slice(end + 2);
      end = buffer.indexOf('\n\n');
    }
  }
  if (buffer.trim()) forwardEvent(buffer, emit);
}

module.exports = { streamAnswer };
