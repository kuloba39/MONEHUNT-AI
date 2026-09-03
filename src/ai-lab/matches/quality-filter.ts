export function passesQualityFilter(
    quality: number,
    confidence: number
) {
    return (
        quality >= 80 &&
        confidence >= 15
    );
}