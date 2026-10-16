import type { ReadableStream as WebReadableStream } from 'node:stream/web';

/** The first bytes of an MP4: a box of type "ftyp". */
export const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(64, 1)]);

export const streamOf = (bytes: Buffer) => new Blob([new Uint8Array(bytes)]).stream() as unknown as WebReadableStream<Uint8Array>;
