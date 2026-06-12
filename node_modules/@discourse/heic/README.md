# @jsquash/heic

[![npm version](https://badge.fury.io/js/@jsquash%2Fheic.svg)](https://badge.fury.io/js/@jsquash%2Fheic)

An easy way to decode HEIC and HEIF images in the browser with WebAssembly.

Uses [libheif](https://github.com/strukturag/libheif) and [libde265](https://github.com/strukturag/libde265).

A [jSquash](https://github.com/jamsinclair/jSquash) package.

## Installation

```shell
npm install --save @jsquash/heic
```

## Usage

Note: You will need to either manually include the wasm files from the codec directory or use a bundler like WebPack or Rollup to include them in your app/server.

### `decode(data: ArrayBuffer): Promise<ImageData>`

Decodes HEIC or HEIF binary data to `ImageData`.

```js
import { decode } from '@jsquash/heic';

const imageBuffer = await fetch('/example.heic').then((res) => res.arrayBuffer());
const imageData = await decode(imageBuffer);
```

## Manual WASM initialisation (not recommended)

The `decode` module exports an `init` function that can be used to manually load the wasm module.

```js
import decode, { init as initHeicDecode } from '@jsquash/heic/decode';

initHeicDecode(WASM_MODULE);
const image = await fetch('./image.heic').then((res) => res.arrayBuffer()).then(decode);
```

You can also pass custom options to the `init` function to customise the behaviour of the module. See the [Emscripten documentation](https://emscripten.org/docs/api_reference/module.html#Module) for more information.

```js
import decode, { init as initHeicDecode } from '@jsquash/heic/decode';

initHeicDecode(null, {
  locateFile: (path, prefix) => `https://example.com/${prefix}/${path}`,
});
```
