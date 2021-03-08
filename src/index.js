const os = require('os');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');

const capitalize = (s) => s.charAt(0).toUpperCase() + s.substring(1);

const getPlatform = () => capitalize(os.platform());

const getArchitecture = () => {
  switch (os.arch()) {
    case 'x64':
      return 'x86_64';
    default:
      core.setFailed('Unsupported Architecture');
      return process.exit();
  }
};

const getArchiveExtension = () => {
  switch (os.platform()) {
    case 'windows':
      return 'zip';
    default:
      return 'tar.gz';
  }
};

const getURL = (version) => {
  const platform = getPlatform();
  const arch = getArchitecture();
  const extension = getArchiveExtension();
  return `https://github.com/cuelang/cue/releases/download/v${version}/cue_${version}_${platform}_${arch}.${extension}`;
};

const extract = (archive) => {
  switch (getArchiveExtension()) {
    case 'zip':
      return tc.extractZip(archive);
    default:
      return tc.extractTar(archive);
  }
};

(async () => {
  const version = core.getInput('cue-version', { required: true });
  const url = getURL(version);
  core.info(`Downloading "${url}"`);
  const archive = await tc.downloadTool(url);
  const folder = await extract(archive);
  const cache = await tc.cacheDir(folder, 'cue', version);
  core.addPath(cache);
})();