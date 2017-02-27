process.on('unhandledRejection', err => console.warn(err));

/* eslint-disable no-console */
import cheerio from 'cheerio';
import request from 'request-promise-native';
import stringify from 'csv-stringify';
import log from './lib/log';

(async function() {
	// console.log(await scrapeDetail('/technology/e-226-2011'));
	console.log(await scrapeDetail('http://gcgh.grandchallenges.org/challenge/saving-lives-birth-round-7'));
});

(async function() {
	let links = await scrapeList('http://gcgh.grandchallenges.org/grant-opportunities');
	let data = [];
	log.setMax('link', links.length);
	for (let link of links) {
		console.warn(link.attribs.href);
		let detail = await scrapeDetail(link.attribs.href);
		if (!detail) {
			continue;
		}
		data.push(detail);
		log.inc('link');
	}
	
	stringify(data, { header: true }, (err, output) => err ? console.warn(err) : console.log(output));
})();

async function scrapeList(link) {
	let raw = await request(link);
	let $ = cheerio.load(raw);
	
	return Array.from($('#main > div > div > div > div.layout-wrapper > div > div.pane.pane--grant-opportunities-panel-pane-1 > div div.field-item h2 a'));
}

async function scrapeDetail(link) {
	let raw = null;
	try {
		raw = await request(link);
	}
	catch (e) {
		return null;
	}
	let $ = cheerio.load(raw);
	let dateOpen = $('#main > div > div > div > div.layout-wrapper > div > div.pane.pane--challenge-meta > div > div > span.field.field--grant-opp-open-date').text().trim();
	dateOpen = dateOpen.slice(11);
	let deadline = $('#main > div > div > div > div.layout-wrapper > div > div.pane.pane--challenge-meta > div > div > span.field.field--grant-opp-closed-date').text().trim();
	deadline = deadline.slice(10);
	let apply = $('#main > div > div > div > div.layout-wrapper > aside > div.pane.pane--grant-opp-apply-now > div > a');
		
	return {
		title: $('#main > div > div > div > div.layout-preface > div > div > h1').text().trim(),
		date_open: dateOpen,
		deadline: deadline,
		summary: $('#main > div > div > div > div.layout-wrapper > div > div.pane.pane--switch-body-description > div').text().trim(),
		link: apply[0].attribs.href,
	};
}
