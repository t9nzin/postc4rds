export type ImageOrientation = "landscape" | "portrait" | "square";

export function getOrientation(
    width: number, 
    height: number
): ImageOrientation {
    if (width > height) return "landscape";
    if (height > width) return "portrait";
    return "square";
}