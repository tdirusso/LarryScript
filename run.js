const fs = require('fs');
const csv = require('csv-parser');
const fetch = require('node-fetch').default;
const cheerio = require('cheerio');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const cliProgress = require('cli-progress');
const colors = require('ansi-colors');

const keywords = [];
const keyToFeaturedSnippetArray = [];

const bar = new cliProgress.SingleBar({
  format: 'Scraping Progress |' + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Keywords',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true
});

fs.createReadStream('./keywords.csv')
  .pipe(csv())
  .on('data', ({ Keyword }) => {
    if (Keyword) {
      keywords.push(Keyword.trim());
    }
  })
  .on('end', () => {
    scrapeKeywords();
  });

async function scrapeKeywords() {
  bar.start(keywords.length, 0);

  for (const keyword of keywords) {
    try {
      const response = await fetch(`https://engine.redseo.io/search?q=${keyword.replaceAll(' ', '+')}`);
      const result = await response.text();

      const $ = cheerio.load(result);

      let featuredSnippet = $('.answer').text();

      if (featuredSnippet) {
        featuredSnippet = featuredSnippet.trim().replace(/[^\w\s.,;?!]/gi, '');
        let lastPeriodIndex = featuredSnippet.lastIndexOf(".");

        keyToFeaturedSnippetArray.push({
          keyword,
          featuredSnippet: featuredSnippet.substring(0, lastPeriodIndex + 1)
        });
      } else {
        keyToFeaturedSnippetArray.push({
          keyword,
          featuredSnippet: ''
        });
      }

      bar.increment();
     //await delay(1500);
    } catch (error) {
      keyToFeaturedSnippetArray.push({
        keyword,
        featuredSnippet: error.message
      });
      bar.increment();
    }
  }

  bar.stop();

  let csvWriteData = csvWriter({
    path: 'output.csv',
    header: [
      { id: 'keyword', title: 'Keyword' },
      { id: 'featuredSnippet', title: 'Featured Snippet' }
    ]
  });

  csvWriteData.writeRecords(keyToFeaturedSnippetArray)
    .then(() => {
      console.log('Data written to CSV file');
    });
}

function delay(ms) {
  return new Promise(res => {
    setTimeout(() => {
      res();
    }, ms);
  });
}