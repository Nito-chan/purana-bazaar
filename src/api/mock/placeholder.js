const PALETTES = {
  mobiles: ['#0f766e', '#134e4a', '#2dd4bf'],
  laptops: ['#4338ca', '#312e81', '#a5b4fc'],
  furniture: ['#9a3412', '#7c2d12', '#fdba74'],
  appliances: ['#a16207', '#713f12', '#fde68a'],
  bikes: ['#b91c1c', '#7f1d1d', '#fca5a5'],
  cycles: ['#15803d', '#14532d', '#86efac'],
  books: ['#7c2d12', '#431407', '#fcd34d'],
  'home-kitchen': ['#4d7c0f', '#365314', '#bef264'],
  other: ['#475569', '#1e293b', '#cbd5e1'],
};

const ART = {
  mobiles:
    '<rect x="152" y="86" width="96" height="196" rx="20"/><line x1="182" y1="108" x2="218" y2="108"/><circle cx="200" cy="260" r="7"/>',
  laptops:
    '<rect x="112" y="112" width="176" height="112" rx="10"/><path d="M88 238h224l-18 24H106z"/><path d="M170 250h60"/>',
  furniture:
    '<path d="M114 214v-38a24 24 0 0 1 24-24h124a24 24 0 0 1 24 24v38"/><path d="M92 214a22 22 0 0 1 44 0v14h128v-14a22 22 0 0 1 44 0v42a12 12 0 0 1-12 12H104a12 12 0 0 1-12-12z"/><path d="M116 268v22M284 268v22"/>',
  appliances:
    '<rect x="150" y="70" width="100" height="238" rx="16"/><path d="M150 148h100"/><path d="M178 104v18"/><path d="M178 184v18"/>',
  bikes:
    '<circle cx="132" cy="256" r="42"/><circle cx="268" cy="256" r="42"/><path d="M132 256h52l38-74h-30"/><path d="M184 256l42-74h44l-10 74"/><path d="M228 182h42"/><path d="M168 166h28"/>',
  cycles:
    '<circle cx="132" cy="256" r="42"/><circle cx="268" cy="256" r="42"/><path d="M132 256l44-78h54l38 78"/><path d="M176 178h58"/><path d="M202 178l30 78"/><path d="M160 150h24"/>',
  books:
    '<path d="M110 128h180v18H110z"/><path d="M120 146h160v20H120z"/><path d="M104 166h192v22H104z"/><path d="M128 188h144v24H128z"/><path d="M116 212h168v20H116z"/><path d="M136 232h128v18H136z"/>',
  'home-kitchen':
    '<path d="M126 158h148l-12 120a22 22 0 0 1-22 20h-80a22 22 0 0 1-22-20z"/><path d="M112 158h176"/><path d="M168 126h64l-8 32h-48z"/><path d="M200 126v-22"/>',
  other:
    '<path d="M200 82l108 58v120l-108 58-108-58V140z"/><path d="M92 140l108 58 108-58"/><path d="M200 198v120"/><path d="M146 112l108 58"/>',
};

export function placeholderImage({
  slug = 'other',
  name = 'Listing',
  variant = 0,
  width = 800,
  height = 800,
}) {
  const palette = PALETTES[slug] || PALETTES.other;
  const art = ART[slug] || ART.other;
  const angle = (variant * 37 + slug.length * 13) % 360;
  const circleX = 300 + (variant % 3) * 18;
  const circleY = 92 + (variant % 2) * 24;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="${width}" height="${height}" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle} .5 .5)">
      <stop offset="0" stop-color="${palette[0]}"/>
      <stop offset="1" stop-color="${palette[1]}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <circle cx="${circleX}" cy="${circleY}" r="128" fill="${palette[2]}" opacity=".16"/>
  <circle cx="70" cy="330" r="64" fill="#fff" opacity=".06"/>
  <g stroke="#fff" fill="none" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity=".92">${art}</g>
  <text x="28" y="370" font-family="system-ui, sans-serif" font-size="15" font-weight="700" letter-spacing="3" fill="#fff" opacity=".86">${escapeXml(name.toUpperCase())}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function placeholderImages(listing, count = 1) {
  const category = listing.category || { slug: 'other', nameEn: 'Other' };
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const url = placeholderImage({
      slug: category.slug,
      name: category.nameEn || 'Listing',
      variant: (listing.variant || 0) + index,
    });
    return {
      url,
      thumbUrl: url,
      alt: `${listing.title} — photo ${index + 1}`,
    };
  });
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
