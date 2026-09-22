// Hand-authored English seed examples. This is demo training data, not a production corpus.
// Every row is exhaustively labeled; a row may have multiple labels.
import { additionalTraining, additionalValidation } from './additional-training.mjs';
const groups = {
  'Age Group': [
    'Suitable for children aged three to six.', 'Designed for adults.', 'Recommended for ages 12 and up.', 'Safe for toddlers over 18 months.', 'Intended for newborn babies.', 'Perfectly sized for preschoolers.', 'For teenagers and young adults.', 'Not suitable for children under three.', 'Made for seniors.', 'Ages 8–14 years.', 'For infants from birth to six months.', 'Intended for grown-ups only.', 'Appropriate for school-aged kids.', 'The recommended minimum age is five.', 'Suitable for all ages.', 'Adult use only.', 'For boys and girls ages four to eight.', 'Toddler age range: 2 to 4 years.', 'Recommended for older children.', 'Sized for babies up to one year.'
  ],
  'Assembly': [
    'Arrives fully assembled.', 'No assembly required.', 'You will need to put it together.', 'Attach the legs using the included screws.', 'Assembly takes about twenty minutes.', 'Tools are required for setup.', 'Simply snap the pieces together.', 'Ships flat packed for home assembly.', 'Two people are needed to assemble this item.', 'Comes preassembled and ready to use.', 'No tools needed to put it together.', 'Screw the base onto the top before use.', 'Step-by-step assembly instructions are provided.', 'Some assembly is required on delivery.', 'The parts click into place without tools.', 'You only need to attach the handle.', 'Requires a Phillips screwdriver to build.', 'Delivered in separate pieces for easy assembly.', 'Fully built before shipping.', 'Unfold it and tighten the bolts to set it up.'
  ],
  'Capacity': [
    'Holds up to twenty liters.', 'Maximum load is 100 kilograms.', 'Accommodates four people.', 'The container has a capacity of 500 ml.', 'Can hold twelve bottles.', 'Supports up to 250 pounds.', 'Seats six comfortably.', 'Stores approximately forty books.', 'The reservoir holds two gallons of water.', 'Weight limit: 80 kg.', 'Has room for eight place settings.', 'The bag carries up to 15 kilograms.', 'Fits 24 cupcakes inside.', 'Can store 100 photographs.', 'The tank capacity is ten liters.', 'There is enough room for three pairs of shoes.', 'Maximum weight capacity is 300 lbs.', 'Holds one liter of liquid.', 'The shelf supports loads of up to 30 kg.', 'Storage capacity: 64 gigabytes.'
  ],
  'Care': [
    'Wipe clean with a damp cloth.', 'Machine wash cold and tumble dry low.', 'Hand wash only.', 'Do not bleach.', 'Clean with mild soap and warm water.', 'Keep out of direct sunlight.', 'Oil the surface every six months.', 'Dry clean only.', 'Avoid soaking in water.', 'Spot clean stains gently.', 'Dishwasher safe on the top rack.', 'Allow to air dry after washing.', 'Use a soft brush to remove dust.', 'Store in a cool dry place.', 'Wash separately with similar colors.', 'Do not iron the print.', 'Apply furniture polish occasionally.', 'Rinse thoroughly after each use.', 'Use a gentle cleaning solution.', 'Keep away from moisture to prevent damage.'
  ],
  'Certifications': [
    'Made with FSC-certified wood.', 'Certified to OEKO-TEX Standard 100.', 'UL listed for electrical safety.', 'Meets ASTM F963 safety standards.', 'GREENGUARD Gold certified.', 'Certified organic by GOTS.', 'CE marked for European conformity.', 'Tested and certified by the Forest Stewardship Council.', 'Complies with EN71 toy safety standards.', 'The fabric carries the GOTS certification.', 'The product is Fairtrade certified.', 'BPA-free certification is provided.', 'Certified by an independent accredited laboratory to ISO 9001.', 'Energy Star certified.', 'Carries the PEFC certification.', 'This item is not certified to any safety standard.', 'No certifications are available for this product.', 'RoHS compliant.', 'Certified to meet CPSC requirements.', 'The label displays a valid UL certification.'
  ],
  'Compatibility': [
    'Fits standard queen-size bed frames.', 'Compatible with iPhone 15.', 'Works with most USB-C devices.', 'Designed to fit IKEA Kallax units.', 'Pairs with any Bluetooth-enabled phone.', 'Fits a standard 27 mm rail.', 'Compatible with Windows and macOS.', 'For use with KitchenAid stand mixers.', 'Will not work with induction stoves.', 'Fits all standard crib mattresses.', 'Works with Alexa and Google Home.', 'Suitable for most 18-inch dolls.', 'Connects to standard garden hoses.', 'Fits M8 threaded fittings.', 'Only compatible with the 2020 model.', 'Can be used with existing wall brackets.', 'Matches the mounting holes on a VESA 100 display.', 'Fits a king-size duvet.', 'Works with both Android and iOS.', 'Use with an E27 light bulb.'
  ],
  'Contents': [
    'Includes two chairs and a table.', 'The package contains one cushion.', 'Comes with a charging cable and adapter.', 'You receive a set of six pieces.', 'Includes a lid and a removable tray.', 'Sold as a pair.', 'One chair is included in the box.', 'Package contents: three prints and matching frames.', 'The set comes with four napkins.', 'Batteries are not included.', 'Includes a carry bag.', 'The box contains the base, screws and instructions.', 'Sold individually; accessories are excluded.', 'You will receive ten blank cards and envelopes.', 'Supplied with two replacement filters.', 'Includes one table and four matching stools.', 'A gift box is included with your purchase.', 'The bundle contains a comb and brush.', 'The price is for one item only.', 'Cushion included; stand sold separately.'
  ],
  'Dimensions': [
    'Measures 30 by 20 by 15 inches.', 'The overall height is 90 cm.', 'Width: 40 cm; depth: 25 cm.', 'Approximately ten inches in diameter.', 'The cord is two meters long.', 'Size is 12 × 16 inches.', 'The frame measures 8 by 10 inches.', 'It is 50 centimeters tall and 30 centimeters wide.', 'Thickness is 5 mm.', 'Total length: 120 cm.', 'External measurements are 20 x 30 x 40 cm.', 'The round top has a diameter of 60 cm.', 'The item stands three feet tall.', 'The opening is 15 inches wide.', 'Dimensions: 24 W × 18 D × 32 H inches.', 'The strap measures 80 centimeters end to end.', 'It measures roughly 6 inches across.', 'The rug is two meters by three meters.', 'Each panel is 4 feet long.', 'Overall size: 100 × 50 cm.'
  ],
  'Features': [
    'Folds flat for easy storage.', 'The height can be adjusted.', 'Has a removable lid.', 'Built-in wheels make it easy to move.', 'Waterproof and scratch resistant.', 'Features a hidden storage compartment.', 'The cover is removable.', 'A non-slip base keeps it steady.', 'Has dimmable lighting.', 'The legs fold underneath.', 'Equipped with a rechargeable battery.', 'The drawers close softly.', 'Reversible for two different looks.', 'Features adjustable straps.', 'The fabric is breathable.', 'A zipper keeps everything secure.', 'Built-in handles make carrying easy.', 'The head swivels through 360 degrees.', 'Has three different speed settings.', 'The shelves can be repositioned.'
  ],
  'Finish': [
    'Finished with a matte coating.', 'The surface has a glossy finish.', 'Sealed with natural beeswax.', 'A satin lacquer protects the surface.', 'Finished in brushed nickel.', 'The surface is powder coated.', 'Left unfinished for you to paint.', 'Has a distressed painted finish.', 'Polished to a high shine.', 'Finished with a clear varnish.', 'The wood is stained dark walnut.', 'A smooth oil finish brings out the grain.', 'Features a hammered surface finish.', 'The exterior is enamel coated.', 'Sealed with a water-based lacquer.', 'The surface is hand waxed.', 'Has a weathered whitewash finish.', 'Brushed to create a textured surface.', 'The finish is satin rather than gloss.', 'Coated in a protective clear sealant.'
  ],
  'Material': [
    'Made from solid oak.', 'Crafted from stainless steel.', '100 percent organic cotton.', 'The frame is aluminum.', 'Woven from natural rattan.', 'Constructed from birch plywood.', 'Made of recycled glass.', 'The fabric is a linen and cotton blend.', 'Genuine leather upholstery.', 'Made from food-grade silicone.', 'The body is ceramic.', 'Handcrafted from walnut wood.', 'The filling is pure wool.', 'Constructed using durable ABS plastic.', 'The chain is sterling silver.', 'Made from bamboo fibers.', 'The cover is polyester.', 'Solid brass construction.', 'The tabletop is marble.', 'Materials: pine wood and steel.'
  ],
  'Personalization': [
    'Add your name or initials.', 'Can be engraved with a personal message.', 'Choose a custom color at checkout.', 'Personalized with your wedding date.', 'We can print your photograph on it.', 'Custom sizes are available on request.', 'Enter the name you would like embroidered.', 'Monogramming is available.', 'Select your own text for the label.', 'Can be customized to match your decor.', 'No personalization is available.', 'This item cannot be customized.', 'Choose from a selection of custom fonts.', 'We can add a special date.', 'Send us your design for a custom print.', 'Made to your exact measurements.', 'Engrave up to twenty characters.', 'Add a family name to the front.', 'Customize the wording on the sign.', 'Pick your preferred thread color.'
  ],
  'Product Type': [
    'This is a bedside table.', 'A dining chair for your home.', 'A decorative wall mirror.', 'This item is a ceramic coffee mug.', 'A handmade tote bag.', 'A set of kitchen storage jars.', 'It is a floor lamp.', 'A wooden bookshelf.', 'This is a baby blanket.', 'A throw pillow for a sofa.', 'A freestanding shoe rack.', 'This product is a necklace.', 'A desk organizer.', 'It is a bar stool.', 'A framed art print.', 'A garden planter.', 'A reusable water bottle.', 'This item is a bench.', 'A handwoven area rug.', 'A wall-mounted coat hook.'
  ],
  'Seat Height': [
    'The seat sits 18 inches above the floor.', 'Seat height: 45 cm.', 'The sitting surface is 30 inches high.', 'Floor-to-seat measurement is 65 centimeters.', 'The seat is positioned 12 inches from the ground.', 'The height of the seat is 75 cm.', 'You sit 42 cm above floor level.', 'The seat height measures 24 inches.', 'From the floor to the top of the cushion is 19 inches.', 'Seating height is approximately 50 cm.', 'The seat stands 16 inches off the ground.', 'Distance from floor to seat: 46 cm.', 'At the seat, it is 60 cm tall.', 'The sitting height is 32 inches.', 'The seat platform is 15 inches above ground.', 'Seat level is 70 centimeters.', 'The seat is 18 inches high without the cushion.', 'The top of the seat is 48 centimeters above the floor.', 'Seating surface height: 28 inches.', 'The chair seat sits at 40 cm.'
  ],
  'Style': [
    'A mid-century modern design.', 'Styled with a rustic farmhouse look.', 'Minimalist Scandinavian styling.', 'Inspired by Art Deco design.', 'A traditional Victorian aesthetic.', 'Contemporary industrial style.', 'Has a bohemian look.', 'Designed in a vintage style.', 'A classic French country design.', 'Clean lines give it a modern aesthetic.', 'Retro styling inspired by the 1970s.', 'A shabby chic design.', 'Sleek and minimalist in style.', 'Traditional Japanese styling.', 'A coastal cottage aesthetic.', 'Inspired by Bauhaus design.', 'The overall style is eclectic.', 'A timeless classic design.', 'Rustic styling for a country home.', 'An ornate baroque look.'
  ],
  'Theme': [
    'Decorated with woodland animals.', 'Features a dinosaur motif.', 'A space-themed design with stars and planets.', 'Printed with flowers and butterflies.', 'The theme is nautical.', 'Decorated with Christmas trees.', 'An ocean motif featuring whales.', 'Patterned with forest creatures.', 'The design features unicorns and rainbows.', 'A tropical leaf pattern.', 'A celestial theme with moons and stars.', 'Illustrated with fairy-tale characters.', 'Features a botanical print.', 'Decorated with tiny hearts.', 'An autumn harvest theme.', 'Covered in geometric triangles.', 'A safari theme with lions and elephants.', 'Printed with sports motifs.', 'The illustration depicts a mountain landscape.', 'A Halloween design featuring pumpkins.'
  ],
};
const negatives = [
  'Age group.', 'Assembly.', 'Capacity.', 'Care.', 'Certifications.', 'Compatibility.', 'Contents.', 'Dimensions.', 'Features.', 'Finish.', 'Material.', 'Personalization.', 'Product type.', 'Seat height.', 'Style.', 'Theme.',
  'Please describe the age group.', 'What are the dimensions?', 'Does this have any certifications?', 'Please add care instructions.', 'Is assembly required?', 'What material is it made from?', 'What is the seat height?', 'Can this be personalized?', 'What is included?', 'What style is this?', 'How much can it hold?', 'Is it compatible?', 'What is the theme?', 'What features does this have?', 'What is the finish?', 'What kind of product is it?',
  'A lovely addition to your home.', 'Thank you for visiting my shop.', 'Shipping takes three business days.', 'On sale this weekend.', 'The color is blue.', 'Made with love and care.', 'I care about quality.', 'This listing is unfinished.', 'We aim to finish your order tomorrow.', 'Assembly information coming soon.', 'Dimensions are not yet available.', 'A great gift for someone special.', 'Please contact me for more details.', 'I bought this three years ago.', 'It is in good condition.', 'Ready to ship.', 'I love this item.', 'Free delivery on orders over fifty dollars.', 'We offer great customer service.', 'Color options are shown in the photos.', 'Certification details are unknown.', 'The material is unspecified.', 'Age group to be confirmed.', 'Seat height unknown.', 'Personalization details coming soon.', 'Capacity not provided.', 'Compatible devices have not been listed.', 'Contents to be confirmed.', 'Style not specified.', 'Theme unknown.'
];
export const training = [
  ...additionalTraining,
  ...Object.entries(groups).flatMap(([label, texts]) => texts.map(text => ({ text, labels: [label] }))),
  ...negatives.map(text => ({ text, labels: [] })),
  { text: 'A solid oak dining chair.', labels: ['Product Type', 'Material'] },
  { text: 'A mid-century modern wooden bedside table.', labels: ['Product Type', 'Style', 'Material'] },
  { text: 'A cotton blanket for babies.', labels: ['Product Type', 'Material', 'Age Group'] },
  { text: 'A ceramic mug with a floral pattern.', labels: ['Product Type', 'Material', 'Theme'] },
  { text: 'FSC-certified oak construction.', labels: ['Certifications', 'Material'] },
  { text: 'The adjustable seat ranges from 45 to 65 cm above the floor.', labels: ['Seat Height', 'Features'] },
  { text: 'Includes a removable cushion.', labels: ['Contents', 'Features'] },
  { text: 'A personalized sterling silver necklace.', labels: ['Product Type', 'Material', 'Personalization'] },
  { text: 'Rustic pine bench with a waxed finish.', labels: ['Product Type', 'Material', 'Style', 'Finish'] },
  { text: 'A dinosaur-themed toy for ages three and up.', labels: ['Product Type', 'Theme', 'Age Group'] },
  { text: 'A waterproof tote bag.', labels: ['Product Type', 'Features'] },
  { text: 'A stainless steel bottle holding 750 ml.', labels: ['Product Type', 'Material', 'Capacity'] },
];

// Validation examples select per-label thresholds. Test examples below remain separate.
export const validation = [
  ...additionalValidation,
  ...[
    ['Age Group', 'Recommended for little ones between two and five years old.', 'Intended for adult users.'],
    ['Assembly', 'The legs must be bolted on after delivery.', 'It comes already put together.'],
    ['Capacity', 'There is space for up to ten wine bottles.', 'It can bear a load of 90 kilos.'],
    ['Care', 'Wash on a gentle cycle, then dry naturally.', 'Dust it with a soft dry rag.'],
    ['Certifications', 'This carries an OEKO-TEX certification.', 'It has no safety certifications.'],
    ['Compatibility', 'It works with Samsung Galaxy phones.', 'Fits a standard twin bed frame.'],
    ['Contents', 'Your order comes with three matching pieces.', 'The package includes a spare cover.'],
    ['Dimensions', 'It measures 36 inches from end to end.', 'Overall width is 55 centimeters.'],
    ['Features', 'Its top lifts up to reveal hidden storage.', 'You can adjust the angle of the backrest.'],
    ['Finish', 'The outside is coated with satin varnish.', 'It has a hand-rubbed oil finish.'],
    ['Material', 'The item is crafted from cherry wood.', 'The shell is made of porcelain.'],
    ['Personalization', 'We can stitch your initials onto the front.', 'You can choose the engraved message.'],
    ['Product Type', 'This is an entryway console table.', 'A pendant light for the kitchen.'],
    ['Seat Height', 'It is 22 inches from the ground to the sitting surface.', 'The seat measures 55 cm from the floor.'],
    ['Style', 'The design has an industrial loft aesthetic.', 'A French provincial look.'],
    ['Theme', 'Adorned with little foxes and rabbits.', 'A rocket and planet print.'],
  ].flatMap(([label, ...texts]) => texts.map(text => ({ text, labels: [label] }))),
  ...['What age is this for?', 'Could you tell me the measurements?', 'The seller cares about every order.', 'It is a wonderful present.', 'A nice blue color.', 'I will finish packing today.', 'Certification pending.', 'Please provide material details.', 'Can you describe the theme?', 'The seat height is not known.'].map(text => ({ text, labels: [] })),
];
export const test = [
  { text: 'Best for youngsters aged seven through ten.', labels: ['Age Group'] },
  { text: 'You will have to screw the four legs into the base.', labels: ['Assembly'] },
  { text: 'Delivered ready to use with nothing to put together.', labels: ['Assembly'] },
  { text: 'There is room inside for eighteen eggs.', labels: ['Capacity'] },
  { text: 'Use a moist rag to gently remove marks.', labels: ['Care'] },
  { text: 'Launder on the delicate setting and hang to dry.', labels: ['Care'] },
  { text: 'This has been certified under the Global Organic Textile Standard.', labels: ['Certifications'] },
  { text: 'Designed to attach to a standard bicycle handlebar.', labels: ['Compatibility'] },
  { text: 'You get one large piece and two smaller ones in the box.', labels: ['Contents'] },
  { text: 'The unit is 72 cm wide and 38 cm deep.', labels: ['Dimensions'] },
  { text: 'The back reclines into three positions.', labels: ['Features'] },
  { text: 'Protected by a layer of clear lacquer.', labels: ['Finish'] },
  { text: 'Crafted entirely from maple timber.', labels: ['Material'] },
  { text: 'Have a short dedication etched on the underside.', labels: ['Personalization'] },
  { text: 'This is a jewelry storage box.', labels: ['Product Type'] },
  { text: 'The distance between the floor and the seating surface is 52 cm.', labels: ['Seat Height'] },
  { text: 'Its aesthetic takes inspiration from Scandinavian minimalism.', labels: ['Style'] },
  { text: 'The pattern depicts bunnies among wildflowers.', labels: ['Theme'] },
  { text: 'A rustic oak dining table.', labels: ['Product Type', 'Material', 'Style'] },
  { text: 'A cotton baby blanket printed with stars.', labels: ['Product Type', 'Material', 'Age Group', 'Theme'] },
  { text: 'Made with care in our studio.', labels: [] },
  { text: 'Please include the dimensions and care information.', labels: [] },
  { text: 'Do you offer personalization?', labels: [] },
  { text: 'No dimensions have been provided.', labels: [] },
  { text: 'Age group and certifications.', labels: [] },
  { text: 'I will finish the order soon.', labels: [] },
  { text: 'It costs thirty dollars.', labels: [] },
  { text: 'What is the seat height?', labels: [] },
];
