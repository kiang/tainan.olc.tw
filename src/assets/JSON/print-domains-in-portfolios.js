import fs from 'fs';

// 把這支檔案跟鵬化的 portfolios.json 放在一起
// 使用 node 執行它
(async () => {
	const domains = await getDomains();
	let unknownCount = 0;
	domains.forEach(d => {
		const company = mappingDomainToNewsComany(d);
		if (company == null) unknownCount++;
		console.log(d, ' => ', company)
	})
	console.log()
	console.log('unknown domain: ', unknownCount)

})();

function getPortfolios() {
	const json = JSON.parse(fs.readFileSync('portfolios.json'));
	return json.data;
}

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}


async function getDomains() {
	const portfolios = getPortfolios();
	/** @type {Array} */
	const newsArr = portfolios
		.map(p => p.news)
		.flat();
	const links = newsArr.map(n => n.link);
	const uniqueDomains = links
		.map(link => (new URL(link)).hostname)
		.filter(onlyUnique)
		.sort();
	return uniqueDomains;
}

// 在這裡加入更多 Domain 的規則
function mappingDomainToNewsComany(domain) {
	const domainRegExpMapping = [
		// Domain 內是否包含 `ltn.`
		{ regExp: /.?ltn./ , company: '自由時報' },
		{ regExp: /.?youtube./ , company: 'Youtube' },
		{ regExp: /.?facebook./ , company: 'Facebook' },
		{ regExp: /.?ettoday./ , company: 'ETtoday新聞雲' },
		{ regExp: /.?agirls.aotter./ , company: '電獺少女' },
	];
	
	for (let i = 0; i < domainRegExpMapping.length; i++) {
		const regExp = domainRegExpMapping[i].regExp;
		if (regExp.test(domain)) return domainRegExpMapping[i].company;
	}
	return null;
}
