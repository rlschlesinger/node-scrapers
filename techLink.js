process.on('unhandledRejection', err => console.warn(err));

/* eslint-disable no-console */
import cheerio from 'cheerio';
import request from 'request-promise-native';
import stringify from 'csv-stringify';
import log from './lib/log';

(async function() {
	// console.log(await scrapeDetail('/technology/e-226-2011'));
	console.log(await scrapeDetail('/patents/9391375'));
});

(async function() {
	let pages = await getPageCount('/patents/all');
	let counter = 0;
	let data = [];
	
	for (counter; counter <= pages; counter++) {
		let links = await scrapeList(`/patents/all?page=${counter}`);
		log.setMax('link', links.length);
		for (let link of links) {
			let detail = await scrapeDetail(link.attribs.href);
			log.inc('link');
			if (!detail) {
				continue;
			}
			data.push(detail);
		}
	}
	
	stringify(data, { header: true }, (err, output) => err ? console.warn(err) : console.log(output));
})();

async function scrapeList(link) {
	let raw = await request(`http://techlinkcenter.org${ link }`);
	let $ = cheerio.load(raw);
	
	return Array.from($('h2.node__title a'));
}

async function scrapeDetail(link) {
	let raw = null;
	try {
		raw = await request(`http://techlinkcenter.org/${ link }`);
	}
	catch (e) {
		return null;
	}
	let $ = cheerio.load(raw);
	console.warn(link);
	let patent_id = $('#content > article > div.field.field-name-field-id.field-type-text.field-label-inline.clearfix > div.field-items > div');
	
	return {
		title: $('h1#page-title').text().trim(),
		patent_id: patent_id[0].children[0].data,
		summary: $('#content > article > div.field.field-name-body.field-type-text-with-summary.field-label-hidden > div > div').text().trim(),
	};
}

async function getPageCount(link) {
	let raw = await request(`http://techlinkcenter.org${ link }`);
	let $ = cheerio.load(raw);
	let page_count = $('li.pager-last a')[0].attribs.href;
	page_count = page_count.slice(18);
	return parseInt(page_count);
}
