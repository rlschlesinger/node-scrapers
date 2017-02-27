
process.on('unhandledRejection', err => console.warn(err));

/* eslint-disable no-console */
import cheerio from 'cheerio';
import request from 'request-promise-native';
import stringify from 'csv-stringify';
import log from './lib/log';

(async function() {
	// console.log(await scrapeDetail('/technology/e-226-2011'));
	console.log(await scrapeDetail('http://www.cde.ca.gov/re/sd/details.asp?cds=01611190130229&public=Y'));
});

(async function() {
	let j = request.jar();
	let cookie = request.cookie('ASPSESSIONIDCQBASAQB=NKDAEEPDFACOPNHGICPPIINK');
	let url = 'http://www.cde.ca.gov';
	j.setCookie(cookie, url);
	
	let pages = 23;
	let counter = 1;
	let data = [];
	
	log.setMax('link', 2300);
	
	loop: for (counter; counter <= pages; counter++) {
		let links = await scrapeList({
			url: `http://www.cde.ca.gov/re/sd/results.asp?nav=${counter}&from=1&to=18&o=1&mode=1&items=100`,
			jar: j,
		});
		for (let link of links) {
			let detail = await scrapeDetail(`http://www.cde.ca.gov/re/sd/${link.attribs.href}`);
			log.inc('link');
			if (!detail) {
				continue;
			}
			data.push(detail);
			if (data.length > 2) {
				break loop;
			}
		}
	}
	
	stringify(data, { header: true }, (err, output) => err ? console.warn(err) : console.log(output));
})();

async function scrapeList(link) {
	let raw = await request(link);
	let $ = cheerio.load(raw);
	
	return Array.from($('tr td a'));
}

async function scrapeDetail(link) {
	console.warn(link);
	let raw = null;
	try {
		raw = await request(link);
	}
	catch (e) {
		return null;
	}
	let $ = cheerio.load(raw);
	let county = $('#content table tr:nth-child(1) td');
	let school = $('#content table tr:nth-child(3) td');
	let address = $('#content table tr:nth-child(14) td');
	let city = $('#content table tr:nth-child(14) td').html().trim().split('<br>');
	city[1] = city[1].split(',');
	city[1][1] = city[1][1].trim().split(' ');
	city = city[1][0];
	let adminstrator = $('#content table tr:nth-child(15) td:nth-child(2)')[0];
	let name = adminstrator.children[0].data.split(' ');

	return {
		county: county.text().trim(),
		school_name: school.text().trim(),
		city: city,
		address: address.html().replace('<br>', ' ').trim(),
		// address: {
		// 	street,
		// 	city,
		// 	state,
		// 	zip,
		// },
		admin_title: adminstrator.children[2].data,
		first_name: name[0],
		last_name: name[1],
		email: adminstrator.children[6].children[0].data,
	};
}

async function getPageCount(link) {
	let raw = await request(`http://techlinkcenter.org${ link }`);
	let $ = cheerio.load(raw);
	let page_count = $('li.pager-last a')[0].attribs.href;
	page_count = page_count.slice(18);
	return parseInt(page_count);
}
