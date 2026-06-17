import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as cheerio from 'cheerio';
import _ from 'lodash';

async function fetchYears(username: string) {
  try {
    console.log(`Fetching years for ${username}...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(`https://github.com/${username}?tab=contributions`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "x-requested-with": "XMLHttpRequest"
      }
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.error(`Fetch years failed with status ${response.status} for ${username}`);
      return [];
    }
    const body = await response.text();
    const $ = cheerio.load(body);
    const years = $(".js-year-link.filter-item")
      .get()
      .map((a) => {
        try {
          const $a = $(a);
          const href = $a.attr("href");
          if (!href) return null;
          const githubUrl = new URL(href, "https://github.com");
          githubUrl.searchParams.set("tab", "contributions");
          return {
            href: `${githubUrl.pathname}${githubUrl.search}`,
            text: $a.text().trim()
          };
        } catch (e) {
          return null;
        }
      }).filter((y): y is { href: string; text: string } => !!y);
    
    // If no years found, at least try current year
    if (years.length === 0) {
      const currentYear = new Date().getFullYear().toString();
      years.push({
        href: `/${username}?tab=contributions&from=${currentYear}-01-01&to=${currentYear}-12-31`,
        text: currentYear
      });
    }
    return years;
  } catch (e) {
    console.error('Error fetching years:', e);
    return [];
  }
}

const COLOR_MAP: Record<string, string> = {
  "0": "#161b22",
  "1": "#0e4429",
  "2": "#006d32",
  "3": "#26a641",
  "4": "#39d353"
};

async function fetchDataForYear(url: string, year: string, format?: string) {
  try {
    console.log(`Fetching data for year ${year} via ${url}...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(`https://github.com${url}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "x-requested-with": "XMLHttpRequest"
      }
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.error(`Fetch data for year ${year} failed with status ${response.status}`);
      return { year, total: 0, contributions: [] };
    }
    
    const body = await response.text();
    const $ = cheerio.load(body);
    
    // Try multiple selectors as GitHub changes them
    const $tds = $("td.ContributionCalendar-day, rect.ContributionCalendar-day");
    const $tips = $("tool-tip[for^='contribution-calendar-day-'], [id^='contribution-calendar-day-']");
    
    const tooltips: Record<string, number> = {};
    
    $tips.each((_, tip) => {
      const $tip = $(tip);
      const id = $tip.attr("for") || $tip.attr("id");
      const dateId = id?.replace("contribution-calendar-day-", "");
      const text = $tip.text().trim();
      const match = text.match(/^([0-9,]+)\s/);
      if (dateId && match) {
         tooltips[dateId] = parseInt(match[1].replace(/,/g, ""), 10);
      }
    });

    const contribText = $(".js-yearly-contributions h2, .ContributionCalendar-header h2")
      .first()
      .text()
      .trim()
      .match(/([0-9,]+)\s+contributions/i);
    
    let contribCount = 0;
    if (contribText) {
      contribCount = parseInt(contribText[1].replace(/,/g, ""), 10);
    }

    const parseDay = (day: any) => {
      const $day = $(day);
      const dateStr = $day.attr("data-date");
      if (!dateStr) return null;
      
      const level = $day.attr("data-level") || "0";
      const levelNum = parseInt(level, 10) || 0;
      
      let count = parseInt($day.attr("data-count") || "0", 10);
      if (!count) {
        const ariaLabel = $day.attr("aria-label");
        const ariaMatch = ariaLabel?.match(/^([0-9,]+)\s/);
        if (ariaMatch) {
          count = parseInt(ariaMatch[1].replace(/,/g, ""), 10);
        }
      }
      if (!count) {
        count = tooltips[dateStr] ?? (levelNum > 0 ? levelNum : 0);
      }
      
      const value = {
        date: dateStr,
        count: count,
        level: levelNum
      };
      return { dateParts: dateStr.split("-").map(d => parseInt(d, 10) || 0), value };
    };

    const contributions = $tds.get().map((day) => parseDay(day)).filter((d): d is any => !!d);

    if (format === "nested") {
       return {
          year,
          total: contribCount,
          contributions: contributions.reduce((o: any, item: any) => {
              const [y, m, d] = item.dateParts;
              if (!o[y]) o[y] = {};
              if (!o[y][m]) o[y][m] = {};
              o[y][m][d] = item.value;
              return o;
          }, {})
       };
    }

    return {
      year,
      total: contribCount,
      contributions: contributions.map((item: any) => item.value)
    };
  } catch (e) {
    console.error(`Error fetching data for year ${year}:`, e);
    return { year, total: 0, contributions: [] };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working' });
  });

  app.get('/api/github-contributions', async (req, res) => {
    console.log(`Received request for /api/github-contributions?username=${req.query.username}`);
    const { username, format } = req.query;
    if (!username) return res.status(400).json({ error: 'Username required' });

    try {
      const years = await fetchYears(username as string);
      
      // Use allSettled to prevent one failing year from breaking the whole request
      const settledResults = await Promise.allSettled(
        years.map((year) => fetchDataForYear(year.href, year.text, format as string))
      );

      const data = settledResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);

      const result = {
        years: data.map(y => ({ year: y.year, total: y.total })),
        contributions: _.flatten(data.map(y => (y as any).contributions))
          .filter(c => c && c.date)
          .sort((a: any, b: any) => b.date.localeCompare(a.date))
      };

      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
      res.json(result);
    } catch (error: any) {
      console.error('GitHub fetch error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
