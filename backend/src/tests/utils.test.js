import { parsePoint, haversineMeters } from '../utils/geo.js';
import { isPrivateAddress, fetchPublicImage } from '../utils/safeFetch.js';
import { parseModelJson } from '../services/geminiService.js';

describe('parsePoint', () => {
  it.each([
    [{ type: 'Point', coordinates: [-80.19, 25.76] }],
    ['POINT(-80.19 25.76)'],
    ['SRID=4326;POINT(-80.19 25.76)'],
    ['(-80.19,25.76)'],
    ['0101000020E61000005C8FC2F5280C54C0C3F5285C8FC23940'],
  ])('parses %p', (value) => {
    const p = parsePoint(value);
    expect(p.latitude).toBeCloseTo(25.76);
    expect(p.longitude).toBeCloseTo(-80.19);
  });

  it('returns null for garbage', () => {
    expect(parsePoint('nope')).toBeNull();
    expect(parsePoint(null)).toBeNull();
  });

  it('computes distances', () => {
    expect(haversineMeters(0, 0, 0, 1)).toBeGreaterThan(111000);
  });
});

describe('SSRF protection', () => {
  it('flags private and reserved addresses', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '192.168.0.1', '172.20.0.1', '::1', 'fd00::1', '::ffff:127.0.0.1']) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
    expect(isPrivateAddress('8.8.8.8')).toBe(false);
  });

  it('rejects non-http and internal URLs before fetching', async () => {
    await expect(fetchPublicImage('file:///etc/passwd')).rejects.toThrow(/http/);
    await expect(fetchPublicImage('http://169.254.169.254/latest/meta-data')).rejects.toThrow(/private/);
    await expect(fetchPublicImage('http://127.0.0.1:3001/health')).rejects.toThrow(/private/);
  });
});

describe('parseModelJson', () => {
  it('handles fenced JSON', () => {
    expect(parseModelJson('```json\n{"priority":"high"}\n```')).toEqual({ priority: 'high' });
    expect(parseModelJson('Sure! {"a":1} hope that helps')).toEqual({ a: 1 });
  });
});
