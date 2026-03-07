const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../public/fulllogo.png');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

const sizes = [192, 512];

async function generateIcons() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error('Error: public/fulllogo.png not found. Please save your logo there.');
        process.exit(1);
    }

    const image = await Jimp.read(INPUT_FILE);

    for (const size of sizes) {
        const resized = image.clone().resize({ w: size, h: size });
        const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
        await resized.write(outputPath);
        console.log(`Generated ${outputPath}`);
    }
}

generateIcons().catch(err => {
    console.error(err);
    process.exit(1);
});
