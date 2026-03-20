/** How the banner background image is sized relative to the card (slider = zoom 50–200%). */
export type PlatformBannerImageResize =
  | "fit"
  | "stretch"
  | "tile"
  | "center"
  | "span";

type LayerStyle = {
  backgroundSize: string;
  backgroundRepeat: string;
  backgroundPosition: string;
};

function imageLayerStyle(
  scale: number,
  mode: PlatformBannerImageResize | undefined
): LayerStyle {
  const s = Math.min(200, Math.max(50, scale));
  const ratio = s / 100;
  const one = `${s}%`;
  const two = `${one} ${one}`;
  const zoomed = `calc(100% * ${ratio}) calc(100% * ${ratio})`;
  const m = mode ?? "center";

  switch (m) {
    case "fit":
      return {
        backgroundSize: `${one} auto`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      };
    case "stretch":
      return {
        backgroundSize: two,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      };
    case "tile":
      return {
        backgroundSize: two,
        backgroundRepeat: "repeat",
        backgroundPosition: "center",
      };
    case "span":
      return {
        backgroundSize: zoomed,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      };
    case "center":
    default:
      return {
        backgroundSize: one,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      };
  }
}

/** Gradient (cover) + image — used on customer promo cards and superadmin preview. */
export function getPlatformBannerImageBackgroundStyle(
  scale: number,
  mode: PlatformBannerImageResize | undefined
): LayerStyle {
  const inner = imageLayerStyle(scale, mode);
  return {
    backgroundSize: `cover, ${inner.backgroundSize}`,
    backgroundRepeat: `no-repeat, ${inner.backgroundRepeat}`,
    backgroundPosition: `center, ${inner.backgroundPosition}`,
  };
}

/** Image URL only (no gradient overlay) — list thumbnails. */
export function getPlatformBannerImageOnlyBackgroundStyle(
  scale: number,
  mode: PlatformBannerImageResize | undefined
): LayerStyle {
  return imageLayerStyle(scale, mode);
}
