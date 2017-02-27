process.on('unhandledRejection', err => console.warn(err));

/* eslint-disable no-console */
import cheerio from 'cheerio';
import request from 'request-promise-native';
import stringify from 'csv-stringify';
import log from './lib/log';

(async function() {
	// console.log(await scrapeDetail('/technology/e-226-2011'));
	console.log(await scrapeDetail('/How-We-Work/General-Information/Grant-Opportunities/LNG-IUS-Request-for-Concept-Memo'));
});

(async function() {
	let links = await scrapeList('http://www.gatesfoundation.org/How-We-Work/General-Information/Grant-Opportunities');
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
	
	return Array.from($('article.articleWrapper a[href^="/How-We-Work/General-Information/Grant"]'));
}

async function scrapeDetail(link) {
	let raw = null;
	try {
		raw = await request(`http://www.gatesfoundation.org${ link }`);
	}
	catch (e) {
		return null;
	}
	let $ = cheerio.load(raw);

	let snapshot = $('#form1 > div.main > div.main-content > article > div:nth-child(1) > p:nth-child(4)');
	let dueDate = snapshot[0].children[10].data;
	dueDate = dueDate.slice(0, dueDate.indexOf(' – '));
	
	let timeline = $('#bodyregion_0_interiorarticle_0_strategysections_1_pnlSection > div:nth-child(2) > div:nth-child(5)').text().trim();
	timeline = timeline.replace('-', '&#45;');
	
	return {
		title: $('div.head h3').text().trim(),
		rfp_number: $('div.strategySection:first-child p a').text().trim(),
		open_date: snapshot[0].children[6].data,
		due_date: dueDate,
		overview: $('#bodyregion_0_interiorarticle_0_strategysections_0_pnlSection > div:nth-child(2) > div:nth-child(5)').text().trim(),
		timeline: timeline,
		requirements: $('#bodyregion_0_interiorarticle_0_strategysections_3_pnlSection > div:nth-child(2) > div:nth-child(5)').text().trim(),
		application_link: 'https://unison.gatesfoundation.org/Pages/Default.aspx',
	};
}
