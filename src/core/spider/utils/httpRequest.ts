import axios from 'axios';

export const axiosInstance = axios.create({
  timeout: 10000,
  httpAgent: new (require('http').Agent)({ keepAlive: true }),
  httpsAgent: new (require('https').Agent)({ keepAlive: true }),
});

export async function fetchWithRetry(url: string, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Failed to fetch after retries');
}