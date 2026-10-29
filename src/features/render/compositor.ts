import type { UserMedia, TemplateSource } from '../../types/media';
import type { TemplateManifest } from '../../types/template';
import type { TransformState, CutoutMask, ChromaKeySettings, VideoTrim } from '../../types/editor';
import { drawSizeInSlot, isUncovered } from '../editor/transform';
import { bakeMaskedTemplate } from './masking';
import { drawKeyedVideoFrame } from './keying';

export interface FrameInput {
  template: TemplateSource;
  media: UserMedia;
  manifest: TemplateManifest;
  transform: TransformState;
  /** Photo template only. Erased regions become transparent. */
  templateMask?: CutoutMask | null;
  /** Video template only. Keyed-out colour becomes transparent. */
  templateChroma?: ChromaKeySettings;
  /** Media video only. Playback window in seconds. */
  trim?: VideoTrim;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  input: FrameInput,
  outputWidth: number,
  outputHeight: number,
): void {
  if (outputWidth <= 0 || outputHeight <= 0) return;

  const { template, media, manifest, transform, templateMask, templateChroma } = input;

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
    if (media.kind === 'photo') {
      ctx.drawImage(media.source, -drawW / 2, -drawH / 2, drawW, drawH);
    } else if (media.source.readyState >= 2) {
      ctx.drawImage(media.source, -drawW / 2, -drawH / 2, drawW, drawH);
    }

    ctx.restore();
  }

  if (template.kind === 'video') {
    if (template.source.readyState < 2) return;
    if (templateChroma?.enabled) {
      const keyCap = Math.min(2560, Math.max(outputWidth, outputHeight));
      drawKeyedVideoFrame(ctx, template.source, templateChroma, 0, 0, outputWidth, outputHeight, keyCap);
    } else {
      ctx.drawImage(template.source, 0, 0, outputWidth, outputHeight);
    }
  } else {
    if (templateMask) {
      const masked = bakeMaskedTemplate(template, templateMask);
      ctx.drawImage(masked, 0, 0, outputWidth, outputHeight);
    } else {
      ctx.drawImage(template.source, 0, 0, outputWidth, outputHeight);
    }
  }
}
