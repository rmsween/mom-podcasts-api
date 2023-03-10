const express = require('express');
const https = require('https');
const app = express();

const cors = require('cors')
app.use(cors());

const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

parent = 'projects/226503712987/secrets/MOM-Megaphone-API-key', // Project for which to manage secrets.
secretId = 'MOM-Megaphone-API-key-2', // Secret ID.
payload = 'hello world!' // String source data.

async function createAndAccessSecret() {
  // Create the secret with automation replication.
  const [secret] = await client.createSecret({
    parent: parent,
    secret: {
      name: secretId,
      replication: {
        automatic: {},
      },
    },
    secretId,
  });

  console.info(`Created secret ${secret.name}`);

  // Add a version with a payload onto the secret.
  const [version] = await client.addSecretVersion({
    parent: secret.name,
    payload: {
      data: Buffer.from(payload, 'utf8'),
    },
  });

  console.info(`Added secret version ${version.name}`);

  // Access the secret.
  const [accessResponse] = await client.accessSecretVersion({
    name: version.name,
  });

  const responsePayload = accessResponse.payload.data.toString('utf8');
  console.info(`Payload: ${responsePayload}`);
}
createAndAccessSecret();
/**
 * Get Podcast By ID
 * @param pid number: Podcast ID
 */
app.get('/podcasts/:pid/', (req, res) => {
  const options = getRequestOptions(`/podcasts/${req.params.pid}`);
  https.get(options, (resp) => {

    let data = '';
    resp.on('data', (chunk) => {
      data += chunk;
    });

    resp.on('end', () => {
      res.json(packageSingleResponse(JSON.parse(data), req.params.id));
    });

  }).on("error", (err) => handleError(err));
});

/**
 * Get Episodes for Podcast
 * @parma id: number: Podcast ID
 */
app.get('/podcasts/:id/episode', (req, res) => {
  const options = getRequestOptions(`/podcasts/${req.params.id}/episodes?draft=false`);
  https.get(options, (resp) => {

    let data = '';
    resp.on('data', (chunk) => {
      data += chunk;
    });

    resp.on('end', () => {
      const episodes = sortEpisodes(JSON.parse(data));
      res.json(packageMultiResponse(episodes, req.params.id));
    });

  }).on("error", (err) => handleError(err));
});

/**
 * Get Episode by ID
 * @param pid: number: Podcast ID
 * @param id: number: Episode ID
 */
app.get('/podcasts/:pid/episode/:id', (req, res) => {
  const options = getRequestOptions(`/podcasts/${req.params.pid}/episodes/${req.params.id}`);
  https.get(options, (resp) => {

    let data = '';
    resp.on('data', (chunk) => {
      data += chunk;
    });

    resp.on('end', () => {
      const episode = getYouTubeVideoLink(JSON.parse(data));
      res.json(packageSingleResponse(episode, req.params.id));
    });

  }).on("error", (err) => handleError(err));
});

app.get('/youtube-playlist/:id', (req, res) => {
  const options = getYouTubeRequestOptions(req.params.id);
  https.get(options, (resp) => {
    let data = '';
    resp.on('data', (chunk) => {
      data += chunk;
    });
    resp.on('end', () => {

    })
  })
})

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});

function sortEpisodes(data) {
  data = data.sort((a,b) => {
    a = getYouTubeVideoLink(a);
    return new Date(b.pubdate) - new Date(a.pubdate);
  });
  return data;
}

function packageMultiResponse(episodes, id) {
  return {
    count: episodes.length,
    id: id,
    data: episodes
  }
}

function packageSingleResponse(episode, id) {
  return {
    id: id,
    data: episode
  }
}

function getRequestOptions(path) {
  return {
    host: 'cms.megaphone.fm',
    path: `/api/networks/47d4e14c-4cad-11ec-8172-dfc4ceacd61e${path ? path : ''}`,
    headers: {
      Authorization: 'Token token="90fa846b352f56a45013b1846eed8fde"'
    }
  }
}

function getYouTubeRequestOptions(playlistId) {
  return {
    host: 'youtube.googleapis.com',
    path: `/youtube/v3/playlistItems?part=snippet%2CcontentDetails&playlistId=${playlistId}&key=AIzaSyDJF-GHPjDLo7-BShKmArlfout08HxTy1E`
  }
}

function handleError(err) {
  console.log("Error: " + err.message);
}

function getYouTubeVideoLink(data) {
  if (data.summary) {

    var urlRegex = /https:\/\/www\.youtube\.com\/watch/i;
    let youTube = '';
    if (data.summary.search(urlRegex) > 0) {
      youTube = data.summary.slice(data.summary.search(urlRegex));
      youTube = youTube.slice(0, youTube.search(/">/i));
      youTube = youTube.replace('watch?v=', 'embed/');
    }
    data.youtubeLink = youTube;
  }

  return data;
}
