declare module 'mammoth' {
  interface MammothResult {
    value: string;       // plain text
    messages: any[];     // warnings
  }

  function extractRawText(options: { buffer: Buffer }): Promise<MammothResult>;
  export { extractRawText };
}