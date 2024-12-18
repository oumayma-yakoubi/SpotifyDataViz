async function loadJSON(filePath){
    const response = await fetch(filePath)
    if(!response.ok) throw new Error(`Could not fetch ${filePath} : ${response.statusText}`);
    return await response.json();
}

async function getUserFileList() {
    const response = await fetch('https://raw.githubusercontent.com/oumayma-yakoubi/SpotifyDataViz/refs/heads/main/index.json');
    return await response.json();
}

async function loadUserData(userFolder, files) {
    const basePath = `https://raw.githubusercontent.com/oumayma-yakoubi/SpotifyDataViz/refs/heads/main/data/${userFolder}`;
    const userData = {user: userFolder, playlists: [], streamingHistory: {music: [], podcast: []} };
    
    for (const file of files){
        if (file.startsWith('StreamingHistory_music')){
            // Regroupement des historiques de musique
            const musicData = await loadJSON(`${basePath}/${file}`);
            userData.streamingHistory.music.push(...musicData);
        }
        else if(file.startsWith('StreamingHistory_podcast')){
          // Regroupement des historiques de podcast
          const podcastData = await loadJSON(`${basePath}/${file}`)  
          userData.streamingHistory.podcast.push(...podcastData);
        }
        else if(file.startsWith('Playlist')){
            // Regroupement des playlists
            const playlistData = await loadJSON(`${basePath}/${file}`);
            userData.playlists.push(...playlistData.playlists);
        } else{
            const fileKey = file.replace('.json', '');
            userData[fileKey] = await loadJSON(`${basePath}/${file}`);
        }
    }
    return userData;
}
// --------------- La structure des données: 
// {
//     user: "user-1",
//     identity: { /* données de identity.json */ },
//     searchQuery: [ /* données de searchQuery.json */ ],
//     streamingHistory: {
//       music: [ /* concaténation des StreamingHistory_music*.json */ ],
//       podcast: [ /* concaténation des StreamingHistory_podcast*.json */ ]
//     },
//     playlists: [
//       /* concaténation des playlist1.json, playlist2.json, etc. */
//     ]
//   }

async function loadAllUsersData() {
    const fileList = await getUserFileList();
    const allData = [];

    for (const [userFolder, files] of Object.entries(fileList)){
        const userData = await loadUserData(userFolder, files)
        allData.push(userData);
    }

    return allData;
    
}


// // Extract the artist counts for a given user
// async function getTopArtists(userFolder) {
//     const basePath = `https://raw.githubusercontent.com/oumayma-yakoubi/SpotifyDataViz/refs/heads/main/data/${userFolder}`;
//     const yourLibraryData = await loadJSON(`${basePath}/YourLibrary.json`);
    
//     const artistCount = {};

//     yourLibraryData.tracks.forEach(track => {
//         const artist = track.artist;
//         if (artist in artistCount) {
//             artistCount[artist] += 1;
//         } else {
//             artistCount[artist] = 1;
//         }
//     });

//     // Sort by the number of tracks (descending order) and take the top 10
//     const sortedArtists = Object.entries(artistCount)
//         .sort((a, b) => b[1] - a[1])
//         .slice(0, 10);

//     return sortedArtists.map(([artist, count]) => ({ name: artist, value: count }));
// }

// // Step 1: Initialize the data and plot the treemap for a given user
// async function plotTopArtistsTreemap(userFolder) {
//     const topArtists = await getTopArtists(userFolder);
//     drawTreemap(topArtists);
// }



async function init() {
    const allData = await loadAllUsersData();
    console.log("Données consolidées: ", allData);
}
init();
