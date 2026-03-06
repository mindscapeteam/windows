const sharp = require('sharp');
const pngToIco = require('png-to-ico').default;
const fs = require('fs');
const path = require('path');

const SOURCE_LOGO = path.join(__dirname, '..', 'src', 'assets', 'logo-source.png');
const ASSETS_DIR = path.join(__dirname, '..', 'src', 'assets');

async function generateIcon() {
  // Icon sizes needed: 16, 32, 48, 64, 128, 256 for .ico
  // Plus 512 and 1024 for high-res PNG usage
  const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

  // Create a 1024x1024 base icon: white rounded square with logo centered
  const baseSize = 1024;
  const cornerRadius = Math.round(baseSize * 0.18); // ~18% corner radius
  const padding = Math.round(baseSize * 0.12); // 12% padding around logo
  const logoSize = baseSize - (padding * 2);

  // Create the rounded rectangle background
  const roundedRect = Buffer.from(
    `<svg width="${baseSize}" height="${baseSize}">
      <rect x="0" y="0" width="${baseSize}" height="${baseSize}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
    </svg>`
  );

  // Resize logo to fit within padding
  const resizedLogo = await sharp(SOURCE_LOGO)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Composite: white rounded rect + logo centered
  const baseIcon = await sharp(roundedRect)
    .composite([{
      input: resizedLogo,
      top: padding,
      left: padding,
    }])
    .png()
    .toBuffer();

  // Generate each size
  const pngBuffers = [];
  for (const size of sizes) {
    const resized = await sharp(baseIcon)
      .resize(size, size, { fit: 'contain' })
      .png()
      .toBuffer();

    // Save PNG files
    const pngPath = path.join(ASSETS_DIR, `icon-${size}.png`);
    fs.writeFileSync(pngPath, resized);
    console.log(`Generated ${pngPath}`);

    pngBuffers.push(resized);
  }

  // Save the 256px version as the main icon.png
  const icon256 = await sharp(baseIcon).resize(256, 256).png().toBuffer();
  fs.writeFileSync(path.join(ASSETS_DIR, 'icon.png'), icon256);
  console.log('Generated icon.png (256x256)');

  // Generate .ico file using the saved PNG files
  const icoSizes = [16, 32, 48, 64, 128, 256];
  const icoPaths = icoSizes.map(s => path.join(ASSETS_DIR, `icon-${s}.png`));

  const icoBuffer = await pngToIco(icoPaths);
  fs.writeFileSync(path.join(ASSETS_DIR, 'icon.ico'), icoBuffer);
  console.log('Generated icon.ico');

  console.log('\nAll icons generated successfully!');
}

generateIcon().catch(console.error);
