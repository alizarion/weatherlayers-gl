import {CompositeLayer} from '@deck.gl/core';
import type {LayerProps, DefaultProps, UpdateParameters, LayersList} from '@deck.gl/core';
import type {Device, Texture} from '@luma.gl/core';
import type {TextureData} from '../../_utils/texture-data.js';
import {createTextureCached, createEmptyTextureCached} from '../../_utils/texture.js';
import {isRepeatBounds} from '../../_utils/bounds.js';
import {ParticleLineLayer} from './particle-line-layer.js';
import type {ParticleLineLayerProps} from './particle-line-layer.js';

/** Caller-owned textures. Uploads must finish synchronously before returning.
 * The layer borrows the handles; only the source may destroy them. Multiple
 * particle simulations may share a source without copying its image data.
 */
export interface ParticleTextureSource {
  getTextures(device: Device): {imageTexture: Texture | null; imageTexture2: Texture | null};
}

type _ParticleLayerProps = ParticleLineLayerProps & {
  image: TextureData | null;
  image2: TextureData | null;
  imageSource?: ParticleTextureSource | null;
  imageRevision?: number;
};

export type ParticleLayerProps = _ParticleLayerProps & LayerProps;

const defaultProps: DefaultProps<ParticleLayerProps> = {
  ...ParticleLineLayer.defaultProps,

  imageTexture: undefined,
  imageTexture2: undefined,
  image: {type: 'object', value: null}, // object instead of image to allow reading raw data
  image2: {type: 'object', value: null}, // object instead of image to allow reading raw data
  imageSource: {type: 'object', value: null},
  imageRevision: {type: 'number', value: 0},
};

export class ParticleLayer<ExtraPropsT extends {} = {}> extends CompositeLayer<ExtraPropsT & Required<_ParticleLayerProps>> {
  static layerName = 'ParticleLayer';
  static defaultProps = defaultProps;

  declare state: CompositeLayer['state'] & {
    props?: ParticleLayerProps;
    imageTexture?: Texture;
    imageTexture2?: Texture;
  };

  renderLayers(): LayersList {
    const {device} = this.context;
    const {props, imageTexture, imageTexture2} = this.state;
    if (!props || !imageTexture) {
      return [];
    }

    return [
      new ParticleLineLayer(this.props, this.getSubLayerProps({
        ...{
          id: 'line',
          data: [],
          imageTexture,
          imageTexture2,
          parameters: {
            cullMode: 'front', // enable culling to avoid rendering on both sides of the globe; front-face culling because it seems deck.gl uses a wrong winding order and setting frontFace: 'cw' throws "GL_INVALID_ENUM: Enum 0x0000 is currently not supported."
            depthCompare: 'always', // disable depth test to avoid conflict with Maplibre globe depth buffer, see https://github.com/visgl/deck.gl/issues/9357
            ...this.props.parameters,
          },
        } satisfies Partial<ParticleLineLayerProps>,

        image: createEmptyTextureCached(device),
        image2: createEmptyTextureCached(device),
      })),
    ];
  }

  updateState(params: UpdateParameters<this>): void {
    const {image, image2, imageUnscale, bounds} = params.props;

    super.updateState(params);

    if (image && imageUnscale && !(image.data instanceof Uint8Array || image.data instanceof Uint8ClampedArray)) {
      throw new Error('imageUnscale can be applied to Uint8 data only');
    }

    if (params.props.imageSource) {
      // Do not use the identity-based image cache for mutable, owned textures.
      // Resolving on updates also handles initialization on a replacement device.
      this.setState(params.props.imageSource.getTextures(this.context.device));
    } else if (params.oldProps.imageSource || image !== params.oldProps.image || image2 !== params.oldProps.image2) {
      const {device} = this.context;
      const {image, image2} = this.props;
  
      const imageTexture = image ? createTextureCached(device, image, isRepeatBounds(bounds as GeoJSON.BBox)) : null;
      const imageTexture2 = image2 ? createTextureCached(device, image2, isRepeatBounds(bounds as GeoJSON.BBox)) : null;
  
      this.setState({imageTexture, imageTexture2});
    }

    this.setState({props: params.props});
  }
}
