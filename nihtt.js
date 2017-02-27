process.on('unhandledRejection', err => console.warn(err));

/* eslint-disable no-console */
import cheerio from 'cheerio';
import request from 'request-promise-native';
import stringify from 'csv-stringify';
import log from './lib/log';

(async function() {
	// console.log(await scrapeDetail('/technology/e-226-2011'));
	console.log(await scrapeDetail('/technology/e-267-2014'));
});

(async function() {
	let links = await scrapeList('/opportunities?body_value=&field_tech2_enumber_value=&field_tech2_inv_last_name_value=&field_ech2_disease_area_term_tid=All&field_tech2_application_term_tid=All&field_tech2_dev_stage_term_tid=All&field_tech2_tech_term_tid=All&field_tech2_ic_term_tid=All&field_tech2_collab_sought_value=All&items_per_page=All');
	let data = [];
	log.setMax('link', links.length);
	for (let link of links) {
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
	let raw = await request(`https://www.ott.nih.gov${ link }`);
	let $ = cheerio.load(raw);
	
	return Array.from($('.content a[href^="/technology"]'));
}

async function scrapeDetail(link) {
	let raw = null;
	try {
		raw = await request(`https://www.ott.nih.gov${ link }`);
		raw = raw
			.replace('<sup2,3</sup>', '<sup>2,3</sup>')
			.replace('<a href="mailto:pazmance@nhlbi.nih">pazmance@nhlbi.nih</li>', '<a href="mailto:pazmance@nhlbi.nih">pazmance@nhlbi.nih</a></li>')
			.replace('(<6 months)', '(&lt;6 months)')
			.replace('(>1 year)', '(&gt;1 year)')
			.replace('and Antisera Recognizing ArfGap Proteins</b></font></div></td>', 'and Antisera Recognizing ArfGap Proteins</b></font></td></tr>')
			.replace('immune response.<p><br><br>', 'immune response.</p><br><br>')
			.replace('</td></tr><td', '</td></tr><tr><td')
			.replace('vary from <1% to 5%', 'vary from &lt;1% to 5%')
			.replace('<0.0001).', '&lt;0.0001).')
			.replace('<0.0001),', '&lt;0.0001),')
			.replace('immunogenicity data. <b></<br><br>', 'immunogenicity data.<br><br>')
			.replace('<a href="mailto:hewesj@mail.nih.gov">hewesj@mail.nih.gov,/a>', '<a href="mailto:hewesj@mail.nih.gov">hewesj@mail.nih.gov</a>')
			.replace('high-risk neuroblastoma remains <30%,', 'high-risk neuroblastoma remains &lt;30%,')
			.replace('dimeglumine (<1kD)', 'dimeglumine (&lt;1kD)')
			.replace('p<=0.03)', 'p&lt;=0.03)')
			.replace('<p>The construct encodes', 'The construct encodes')
		;
	}
	catch (e) {
		return null;
	}
	let $ = cheerio.load(raw);
	console.warn(link);
	let content = $('.content .content')[0];
	let contact = extractContact(content);
	
	return {
		title: $('h1').text().trim(),
		description: extractDescription(content),
		commercial_applications: extractLists($, 0).join('; '),
		competitive_advantages: extractLists($, 1).join('; '),
		related_inventions: extractInventions(content).join('; '),
		inventors: extractInventors(content).join('; '),
		ip: extractIP(content).join('; '),
		collaboration: extractCollaboration(content),
		publications: extractPublications(content).join('; '),
		contact_name: contact.name,
		contact_email: contact.email,
		contact_phone: contact.phone,
		ott: extractOTT(content),
	};
}

function extractDescription(content) {
	let description = [];
	
	for (let child of content.children) {
		if (child.type === 'tag' && (child.name === 'table' || child.name === 'b')) {
			break;
		}
		
		if (child.type === 'text') {
			description.push(child.data.trim());
		}
		else if (child.type === 'tag') {
			description.push(extractText(child.children[0]));
		}
	}
	
	return description.filter(v => v).join('\n\n');
}

function extractLists($, index) {
	let lists = $(`.content .content tr:nth-child(2) td:nth-child(${ index * 2 + 1}) ul`);
	
	if (!lists[index]) {
		let item = $('.content .content tr:nth-child(2) td')[index * 2];
		if (item) {
			return [ extractText(item.children[0]) ];
		}
		return [];
	}
	
	let results = [];
	
	let applications = Array.from($('li', lists[index]));
	
	for (let application of applications) {
		results.push(extractText(application.children[0]));
	}
	
	return results;
}

function extractSection(content, header) {
	let start = null;
	let end = null;
	
	for ( let i in content.children ) {
		// console.warn (i, content.children[i].type, content.children[i].name);
		if ( start !== null && content.children[i].name === 'b') {
			end = i;
			break;
		}
		if ( content.children[i].name === 'b') {
			let text = content.children[i].children.find( (node) => {
				return node.type === 'text';
			});
			if ( text && text.data.trim() === header) {
				start = i;
			}
		}
	}
	
	if (start === null) {
		return [];
	}

	return content.children.slice(start, end || -3);
}

function extractInventions(content) {
	let list = extractSection(content, 'Related Invention(s):');

	let inventions = [];
	
	for (let invention of list) {
		if (invention.name === 'a') {
			inventions.push(invention.children[0].data.trim());
		}
	}
	
	return inventions;
}

function extractInventors(content) {
	let list = extractSection(content, 'Inventors:');
	
	let inventors = [];
	
	for (let item of list) {
		if (item.type === 'tag' && item.name === 'a') {
			let name = item.children[0].data.trim();
			if (name === '➽ more inventions...') {
				continue;
			}
			inventors.push(name);
		}
		else if (item.type === 'text') {
			let name = item.data.slice(0, item.data.indexOf('(')).trim();
			if (!name) {
				continue;
			}
			inventors.push(name);
		}
	}
	
	return inventors;
}

function extractIP(content) {
	let child = extractSection(content, 'Intellectual Property:')[1];
	
	if (!child) {
		return [];
	}
	let list = [];
	
	getText(child);
	
	return list;
	
	function getText(child, output = '') {
		if (child.type === 'tag' && child.name === 'b') {
			return null;
		}
		
		if (child.type === 'tag' && child.name === 'br') {
			output = output.trim();
			if (output) {
				list.push(output);
			}
			
			return getText(child.next);
		}
		
		if (child.type === 'tag') {
			return getText(child.next, output + ' ' + extractText(child.children[0]));
		}
		
		if (child.type === 'text') {
			return getText(child.next, output + ' ' + child.data.trim());
		}
		
		return getText(child.next, output);
	}
}

function extractPublications(content) {
	let child = extractSection(content, 'Publications:')[1];
	
	if (!child) {
		return [];
	}
	let list = [];
	
	getText(child);
	
	return list;
	
	function getText(child, output = '') {
		if (child.type === 'tag' && child.name === 'b') {
			return null;
		}
		
		if (child.type === 'tag' && child.name === 'br') {
			output = output.trim();
			if (output) {
				list.push(output);
			}
			
			return getText(child.next);
		}
		
		if (child.type === 'tag') {
			return getText(child.next, output + ' ' + extractText(child.children[0]));
		}
		
		if (child.type === 'text') {
			return getText(child.next, output + ' ' + child.data.trim());
		}
		
		return getText(child.next, output);
	}
}

function extractCollaboration(content) {
	let child = extractSection(content, 'Collaboration Opportunity:')[1];
	
	return extractText(child);
}

function extractContact(content) {
	let list = extractSection(content, 'Licensing Contact:');
	if (list.length < 7) {
		return {};
	}
	
	return {
		name: list[2].children[0].data.trim(),
		email: list[5].children[0] && list[5].children[0].data.trim(),
		phone: list[7].data.trim().slice(7),
	};
}

function extractOTT(content) {
	let list = extractSection(content, 'OTT Reference No:');
	
	return list[1].data.trim();
}

function extractText(child, output = '') {
	if (!child) {
		return output;
	}
	
	if (child.type === 'tag' && child.name === 'b') {
		return output;
	}
	
	if (child.type === 'tag') {
		return extractText(child.next, output + ' ' + extractText(child.children[0]));
	}
	
	if (child.type === 'text') {
		return extractText(child.next, output + ' ' + child.data.trim());
	}
	
	return extractText(child.next, output);
}
