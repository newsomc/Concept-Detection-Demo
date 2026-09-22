import { training, validation, test } from './training.mjs';
import { descriptorDefinitions, productCategories } from './marketplace-taxonomy.mjs';

// Independently authored sentences; no marketplace listings or API content.
// Each pool is split by position: six training, two validation, two test.
const pools = {
  color: ['The fabric is burgundy.', 'Finished in pale yellow.', 'The item is sky blue.', 'Colored charcoal gray.', 'The main color is coral pink.', 'The bag is dark green.', 'Offered in midnight black.', 'The piece has a cream color.', 'The exterior is bright turquoise.', 'The shade is dusty rose.'],
  clothing_size: ['Available in small, medium and large.', 'Garment size: XXL.', 'The label reads size 12.', 'The shirt fits a 42-inch chest.', 'Choose size extra small.', 'Size range is US 4 to 16.', 'Offered in European size 38.', 'The garment is labeled petite medium.', 'Fits chest measurements of 96 to 102 centimeters.', 'You can order a size triple XL.'],
  fit: ['The cut is slim and tailored.', 'An oversized silhouette.', 'It drapes loosely around the body.', 'A close-fitting shape.', 'The fit is relaxed rather than tight.', 'The garment has a boxy cut.', 'Roomy through the waist and chest.', 'Designed for a body-hugging fit.', 'The silhouette is loose and flowing.', 'Cut generously across the shoulders.'],
  sleeve_length: ['It has elbow-length sleeves.', 'The sleeves reach to the wrists.', 'A short-sleeved design.', 'The garment has no sleeves.', 'Sleeves are three-quarter length.', 'The sleeves extend to the hands.', 'A long-sleeved cut.', 'Sleeves finish just above the elbow.', 'The arms are left uncovered by this sleeveless design.', 'Its sleeves stop midway down the forearm.'],
  scent: ['The fragrance combines sandalwood and rose.', 'It smells of fresh pine.', 'An unscented version.', 'Infused with a lemon fragrance.', 'A blend of peppermint and eucalyptus aromas.', 'The scent is warm amber.', 'Notes of orange blossom and musk.', 'There is no added fragrance.', 'Its aroma mixes bergamot with black tea.', 'It gives off a cinnamon and clove scent.'],
  burn_time: ['Burn time is about 25 hours.', 'It burns for up to 60 hours.', 'Provides roughly 15 hours of burning.', 'Estimated burn duration: 30 hours.', 'Expect around 20 hours before it is used up.', 'The total burning time is 45 hours.', 'Approximately 55 hours of burn time.', 'You can expect an eight-hour burn.', 'The flame lasts for roughly 32 hours in total.', 'Burning lifespan is between 70 and 80 hours.'],
  wick_type: ['Uses a flat wooden wick.', 'The wick is made from woven cotton.', 'A single hemp wick runs through the center.', 'Features three cotton-core wicks.', 'The wick is zinc-free cotton.', 'A natural wood wick creates a crackle.', 'Fitted with an unbleached cotton wick.', 'Two braided hemp wicks are used.', 'The center wick consists of a thin strip of cedar.', 'Its wick is a tightly braided cotton cord.'],
  chain_length: ['The necklace is 20 inches long.', 'A 50-centimeter chain is supplied.', 'The chain adjusts between 16 and 18 inches.', 'Necklace length: 42 cm.', 'The chain measures 60 centimeters end to end.', 'A 24-inch chain length.', 'Length of the necklace is 55 cm.', 'The chain is adjustable up to 22 inches.', 'The necklace hangs on a chain measuring 48 centimeters.', 'Its chain can be extended from 17 to 19 inches.'],
  closure: ['It closes with a drawstring.', 'A toggle clasp secures it.', 'The fastening is a hook and eye.', 'Snaps hold the opening shut.', 'A spring ring clasp fastens it.', 'The top is secured with a buckle.', 'Fastened using a magnetic clasp.', 'It zips closed along the top.', 'A button and loop keep the opening shut.', 'The fastening uses a sliding barrel clasp.'],
  gemstone: ['The stone is turquoise.', 'It contains a faceted emerald.', 'Set with a polished amethyst.', 'An opal sits in the center.', 'The gem is rose quartz.', 'Features a small ruby.', 'The focal stone is aquamarine.', 'Set with natural peridot.', 'The centerpiece is a polished cabochon of labradorite.', 'Its featured gem is blue topaz.'],
  framing: ['The print is sold without a frame.', 'Supplied in a white wooden frame.', 'A metal frame surrounds the artwork.', 'Framing is not included.', 'An optional frame can be added.', 'The artwork is already framed.', 'Ships as an unframed sheet.', 'Arrives mounted behind glass in a frame.', 'The price covers the artwork only, with no framing supplied.', 'A thin walnut frame accompanies the picture.'],
  print_process: ['Produced by letterpress printing.', 'This is a lithographic reproduction.', 'Printed with a hand-carved woodblock.', 'The process is cyanotype printing.', 'The image is a risograph print.', 'Made with traditional etching techniques.', 'A serigraph pulled by hand.', 'Produced with digital pigment printing.', 'Created by pressing ink through a silk screen.', 'The image was transferred using a carved relief block.'],
  strap_length: ['Strap length is 90 cm.', 'The handles have a 10-inch drop.', 'The shoulder strap extends to 130 centimeters.', 'Handle drop: 22 cm.', 'The strap adjusts from 30 to 45 inches.', 'The handles measure 60 cm in length.', 'An adjustable 75–110 cm strap.', 'The strap is 36 inches from end to end.', 'Its shoulder strap reaches a maximum length of 125 centimeters.', 'The distance from the handles to the opening is 28 cm.'],
  occasion: ['Designed for an anniversary celebration.', 'A keepsake for a baby shower.', 'Intended for a retirement party.', 'Made for a Christmas gathering.', 'A decoration for an engagement party.', 'For a housewarming celebration.', 'Designed for a christening.', 'For a wedding reception.', 'Created to commemorate a graduation ceremony.', 'A decoration intended for a birthday celebration.'],
};
export const unseenDescriptorIds = ['wick_type', 'gemstone', 'framing', 'print_process'];
const ids = new Map(descriptorDefinitions.map(d => [d.name, d.id]));
const convert = rows => rows.map(row => ({ ...row, labels: row.labels.map(name => ids.get(name)).filter(Boolean), source: 'project-authored-v1' }));
const parts = { training: convert(training), validation: convert(validation), test: convert(test), unseen: [] };
for (const [id, texts] of Object.entries(pools)) texts.forEach((text, i) => {
  const row = { text, labels: [id], source: 'original-marketplace-expansion' };
  if (unseenDescriptorIds.includes(id)) parts.unseen.push(row);
  else parts[i < 6 ? 'training' : i < 8 ? 'validation' : 'test'].push(row);
});
// Add presence/absence challenges without treating bare property names as facts.
for (const [index, d] of descriptorDefinitions.entries()) {
  if (unseenDescriptorIds.includes(d.id)) continue;
  parts.training.push({ text: `The ${d.name.toLowerCase()} has not been specified.`, labels: [], source: 'missing-information-template' });
  const row = { text: `Please tell me about the ${d.name.toLowerCase()} of this item.`, labels: [], source: 'request-not-answer-template' };
  parts[index % 3 === 0 ? 'validation' : 'training'].push(row);
}
// Retain a few clear overlap annotations for the expanded descriptor set.
for (const rows of Object.values(parts)) for (const row of rows) {
  if (row.text === 'The color is blue.') row.labels = ['color'];
  if (row.text === 'Made with FSC-certified wood.') row.labels = ['certifications', 'material'];
}
const canonical = text => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const support = new Set(descriptorDefinitions.flatMap(d => [...d.examples, ...d.nonAnswers, d.question]).map(canonical));
// Exact overlaps with runtime support examples do not belong in an accuracy test.
for (const key of Object.keys(parts)) parts[key] = parts[key].filter(row => !support.has(canonical(row.text)));
const testKeys = new Set([...parts.test, ...parts.unseen].map(row => canonical(row.text)));
parts.validation = parts.validation.filter(row => !testKeys.has(canonical(row.text)));
const validationKeys = new Set(parts.validation.map(row => canonical(row.text)));
parts.training = parts.training.filter(row => !testKeys.has(canonical(row.text)) && !validationKeys.has(canonical(row.text)));

// Compose longer descriptions only from rows within the same split.
// Parent rows and their composites never cross a split boundary.
for (const split of ['training', 'validation', 'test']) {
  const originals = [...parts[split]];
  for (const category of productCategories) {
    const available = originals.filter(row => row.labels.length && row.labels.every(id => category.descriptors.includes(id)));
    for (let i = 0; i + 2 < available.length && i < 30; i += 3) {
      const group = available.slice(i, i + 3);
      parts[split].push({ text: group.map(row => row.text).join(' '), labels: [...new Set(group.flatMap(row => row.labels))], category: category.id, source: 'within-split-composition', parents: group.map(row => row.text) });
    }
  }
}
export const questionDataset = parts;
export const datasetProvenance = { source: 'Original project-authored examples and deterministic within-split combinations.', externalData: false, note: 'Synthetic seed data; not representative marketplace accuracy. Four descriptor IDs are excluded from fitting and threshold selection, but have runtime definitions and support examples.' };
