'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Embedded image test data for Proposal builder tests.
 *
 * Used by steps like "I add Image element using embedded jpeg test data" to avoid
 * relying on external hosted images or local file upload dialogs.
 *
 * Sources (in priority order):
 * - `PROPOSAL_IMAGE_DATA_URL` env var (full data: URL)
 * - `proposalImageDataUrl.txt` next to this file (either a data: URL or raw base64)
 * - a tiny 1×1 JPEG fallback data URL
 */
/** 1×1 JPEG if no file / env (keeps URL flow test runnable). */
const FALLBACK_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

const txtPath = path.join(__dirname, 'proposalImageDataUrl.txt');

function loadEmbeddedJpegDataUrl() {
  const fromEnv = process.env.PROPOSAL_IMAGE_DATA_URL;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.trim();
  }
  try {
    const raw = fs.readFileSync(txtPath, 'utf8').trim();
    if (raw) {
      return raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`;
    }
  } catch (_) {
    /* missing file → fallback */
  }
  return FALLBACK_DATA_URL;
}

/** User JPEG as data: URL — from env, proposalImageDataUrl.txt beside this file, or tiny fallback. */
Object.defineProperty(module.exports, 'EMBEDDED_JPEG_DATA_URL', {
  configurable: true,
  enumerable: true,
  get() {
    return loadEmbeddedJpegDataUrl();
  },
});

module.exports.loadEmbeddedJpegDataUrl = loadEmbeddedJpegDataUrl;
