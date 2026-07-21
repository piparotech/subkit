const colors = {
  lightBackground: [0.985, 0.004, 275],
  lightForeground: [0.225, 0.025, 275],
  lightMutedForeground: [0.46, 0.025, 275],
  lightPrimary: [0.52, 0.2, 285],
  lightPrimaryForeground: [0.99, 0, 0],
  darkBackground: [0.18, 0.022, 275],
  darkForeground: [0.94, 0.008, 275],
  darkMutedForeground: [0.72, 0.02, 275],
  darkPrimary: [0.72, 0.16, 285],
  darkPrimaryForeground: [0.17, 0.03, 285],
}

function oklchToLinearRgb([lightness, chroma, hue]) {
  const radians = (hue * Math.PI) / 180
  const a = chroma * Math.cos(radians)
  const b = chroma * Math.sin(radians)
  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b
  const l = lPrime ** 3
  const m = mPrime ** 3
  const s = sPrime ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => Math.max(0, Math.min(1, channel)))
}

function luminance(color) {
  const [red, green, blue] = oklchToLinearRgb(color)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrast(foreground, background) {
  const foregroundLuminance = luminance(colors[foreground])
  const backgroundLuminance = luminance(colors[background])
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  )
}

const pairs = [
  ['lightForeground', 'lightBackground', 4.5],
  ['lightMutedForeground', 'lightBackground', 4.5],
  ['lightPrimaryForeground', 'lightPrimary', 4.5],
  ['darkForeground', 'darkBackground', 4.5],
  ['darkMutedForeground', 'darkBackground', 4.5],
  ['darkPrimaryForeground', 'darkPrimary', 4.5],
]

for (const [foreground, background, minimum] of pairs) {
  const value = contrast(foreground, background)
  if (value < minimum) {
    throw new Error(`${foreground} on ${background}: ${value.toFixed(2)}:1, expected ${minimum}:1`)
  }
  console.log(`${foreground} on ${background}: ${value.toFixed(2)}:1`)
}
