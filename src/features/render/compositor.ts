import type { PhotoMedia, TemplateSource } from '../../types/media';
import type { TemplateManifest } from '../../types/template';
import type { TransformState } from '../../types/editor';
import { drawSizeInSlot, isUncovered } from '../editor/transform';

export interface FrameInput {
  template: TemplateSource;
  media: PhotoMedia;
  manifest: TemplateManifest;
  transform: TransformState;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  input: FrameInput,
  outputWidth: number,
  outputHeight: number,
): void {
  if (outputWidth <= 0 || outputHeight <= 0) return;

  const { template, media, manifest, transform } = input;

  ctx.clearRect(0, 0, outputWidth, outputHeight);

  if (media.width > 0 && media.height > 0) {
    const slot = manifest.slot;
    const slotX = slot.x * outputWidth;
    const slotY = slot.y * outputHeight;
    const slotW = slot.width * outputWidth;
    const slotH = slot.height * outputHeight;

    ctx.save();

    const polygon = manifest.slotPolygon;
    if (polygon && polygon.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(polygon[0].x * outputWidth, polygon[0].y * outputHeight);
      for (let i = 1; i < polygon.length; i++) {
        ctx.lineTo(polygon[i].x * outputWidth, polygon[i].y * outputHeight);
      }
      ctx.closePath();
      ctx.clip();
    } else {
      ctx.beginPath();
      ctx.rect(slotX, slotY, slotW, slotH);
      ctx.clip();
    }

    const slotAspect = slotW / slotH;
    const sizeInSlot = drawSizeInSlot(media.width, media.height, slotAspect, transform.scale);

    if (isUncovered(transform, sizeInSlot)) {
      ctx.fillStyle = '#FFF8EC';
      if (polygon && polygon.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(polygon[0].x * outputWidth, polygon[0].y * outputHeight);
        for (let i = 1; i < polygon.length; i++) {
          ctx.lineTo(polygon[i].x * outputWidth, polygon[i].y * outputHeight);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(slotX, slotY, slotW, slotH);
      }
    }

    const drawW = sizeInSlot.width * slotW;
    const drawH = sizeInSlot.height * slotH;
    const centerX = slotX + slotW / 2 + transform.offsetX * slotW;
    const centerY = slotY + slotH / 2 + transform.offsetY * slotH;

    ctx.translate(centerX, centerY);
    ctx.rotate(transform.rotation);
    ctx.scale(transform.flipX ? -1 : 1, 1);
    ctx.drawImage(media.source, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();
  }

  const isVideoTemplate = template.kind === 'video';
  const skipTemplate = isVideoTemplate && template.source.readyState < 2;

  if (!skipTemplate) {
    ctx.drawImage(template.source, 0, 0, outputWidth, outputHeight);
  }
}
