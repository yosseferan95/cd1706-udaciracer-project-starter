// PROVIDED CODE BELOW (LINES 1 - 80) DO NOT REMOVE

console.log('this file is linked sucssefully')

let store = {
  track_id: undefined,
  track_name: undefined,
  player_id: undefined,
  player_name: undefined,
  race_id: undefined,
}

// Wait until the DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
  onPageLoad()
  setupClickHandlers()
})

async function onPageLoad() {
  console.log("Getting form info for dropdowns!")
  try {
    getTracks()
      .then(tracks => {
        const html = renderTrackCards(tracks)
        renderAt('#tracks', html)
      })
    getRacers()
      .then((racers) => {
        const html = renderRacerCars(racers)
        renderAt('#racers', html)
      })
  } catch(error) {
    console.log("Problem getting tracks and racers ::", error.message)
    console.error(error)
  }
}

function setupClickHandlers() {
  document.addEventListener('click', function(event) {
    const { target } = event

    // Race track selection
    if (target.matches('.card.track')) {
      handleSelectTrack(target)
      store.track_id = target.id
      store.track_name = target.innerHTML
    }

    // Racer selection
    if (target.matches('.card.racer')) {
      handleSelectRacer(target)
      store.player_id = target.id
      store.player_name = target.innerHTML
    }

    // Submit create race form
    if (target.matches('#submit-create-race')) {
      event.preventDefault()
      handleCreateRace()
    }

    // Accelerate button click
    if (target.matches('#gas-peddle')) {
      handleAccelerate()
    }

    console.log("Store updated :: ", store)
  }, false)
}

async function delay(ms) {
  try {
    return await new Promise(resolve => setTimeout(resolve, ms));
  } catch(error) {
    console.log("an error shouldn't be possible here")
    console.log(error)
  }
}

// BELOW THIS LINE IS CODE WHERE STUDENT EDITS ARE NEEDED
// This function controls the flow of the race.
async function handleCreateRace() {
  try {
    store.race_id = undefined;
    
    const race = await createRace(store.player_id, store.track_id);
    console.log('Race creation response:', race);
    
    if (!race?.ID) {
      throw new Error(`Invalid race response: ${JSON.stringify(race)}`);
    }
    
    store.race_id = race.ID;
    console.log('Store after race creation:', store);
    
    // Render the race view (this container should exist in your HTML, e.g. <div id="race"></div>)
    renderAt('#race', renderRaceStartView({ name: store.track_name }));
    
    // Run the countdown before starting the race
    await runCountdown();
    
    // Start the race
    await startRace(store.race_id);
    
    // Poll the race status and update the leaderboard until finished
    await runRace(store.race_id);
  } catch (error) {
    console.error('Full error details:', {
      error,
      storeState: store,
      selection: {
        player: `${store.player_id} - ${store.player_name}`,
        track: `${store.track_id} - ${store.track_name}`
      }
    });
  }
}

function runRace(raceID) {
  return new Promise((resolve, reject) => {
    const raceInterval = setInterval(async () => {
      try {
        const raceData = await getRace(raceID);
        if (raceData.status === "in-Progress") {
          renderAt('#leaderBoard', raceProgress(raceData.positions));
        } else if (raceData.status === "finished") {
          clearInterval(raceInterval);
          renderAt('#race', resultsView(raceData.positions));
          resolve(raceData);
        }
      } catch (error) {
        console.error("error in runRace", error);
        clearInterval(raceInterval);
        reject(error);
      }
    }, 500);
  });
}

async function runCountdown() {
  try {
    await delay(1000);
    let timer = 3;
    return new Promise(resolve => {
      const countDown = setInterval(() => {
        document.getElementById('big-numbers').innerHTML = timer;
        if (timer === 0) {
          clearInterval(countDown);
          resolve();
        }
        timer--;
      }, 1000);
    });
  } catch(error) {
    console.log(`Error in runCountdown: ${error}`);
  }
}

function handleSelectRacer(target) {
  console.log("selected a racer", target.id);
  const selected = document.querySelector('#racers .selected');
  if (selected) {
    selected.classList.remove('selected');
  }
  target.classList.add('selected');
}

function handleSelectTrack(target) {
  console.log("selected track", target.id);
  const selected = document.querySelector('#tracks .selected');
  if (selected) {
    selected.classList.remove('selected');
  }
  target.classList.add('selected');
}

// Updated handleAccelerate: calls accelerate and then refreshes the leaderboard immediately.
async function handleAccelerate() {
  console.log("accelerate button clicked");
  await accelerate();
  try {
    const raceData = await getRace(store.race_id);
    if (raceData && raceData.positions) {
      renderAt('#leaderBoard', raceProgress(raceData.positions));
    }
  } catch (err) {
    console.error("Error updating leaderboard after accelerate", err);
  }
}

// HTML VIEWS ------------------------------------------------

function renderRacerCars(racers) {
  if (!racers.length) {
    return `<h4>Loading Racers...</h4>`;
  }
  const results = racers.map(renderRacerCard).join('');
  return `<ul id="racers">${results}</ul>`;
}

function renderRacerCard(racer) {
  const { id, driver_name } = racer;
  return `<h4 class="card racer" id="${id}">${driver_name}</h4>`;
}

function renderTrackCards(tracks) {
  if (!tracks.length) {
    return `<h4>Loading Tracks...</h4>`;
  }
  const results = tracks.map(renderTrackCard).join('');
  return `<ul id="tracks">${results}</ul>`;
}

function renderTrackCard(track) {
  const { id, name } = track;
  return `<h4 id="${id}" class="card track">${name}</h4>`;
}

function renderCountdown(count) {
  return `
    <h2>Race Starts In...</h2>
    <p id="big-numbers">${count}</p>
  `;
}

function renderRaceStartView(track) {
  return `
    <header>
      <h1>Race: ${track.name}</h1>
    </header>
    <main id="two-columns">
      <section id="leaderBoard">
        ${renderCountdown(3)}
      </section>
      <section id="accelerate">
        <h2>Directions</h2>
        <p>Click the button as fast as you can to make your racer go faster!</p>
        <button id="gas-peddle">Click Me To Win!</button>
      </section>
    </main>
    <footer></footer>
  `;
}

function resultsView(positions) {
  const userPlayer = positions.find(e => e.id === parseInt(store.player_id));
  if (userPlayer) userPlayer.driver_name += " (you)";
  let count = 1;
  const results = positions.map(p => {
    return `<tr><td><h3>${count++} - ${p.driver_name}</h3></td></tr>`;
  });
  return `
    <header>
      <h1>Race Results</h1>
    </header>
    <main>
      <h3>Race Results</h3>
      <p>The race is done! Here are the final results:</p>
      ${results.join('')}
      <a href="/race">Start a new race</a>
    </main>
  `;
}

function raceProgress(positions) {
  let userPlayer = positions.find(e => e.id === parseInt(store.player_id));
  if (userPlayer) userPlayer.driver_name += " (you)";
  positions = positions.sort((a, b) => (a.segment > b.segment) ? -1 : 1);
  let count = 1;
  const results = positions.map(p => {
    return `<tr><td><h3>${count++} - ${p.driver_name}</h3></td></tr>`;
  });
  return `<table>${results.join('')}</table>`;
}

function renderAt(element, html) {
  const node = document.querySelector(element);
  node.innerHTML = html;
}

// API CALLS ------------------------------------------------

const SERVER = 'http://localhost:3001';

function defaultFetchOpts() {
  return {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': SERVER,
    },
  };
}

function getTracks() {
  console.log(`calling server :: ${SERVER}/api/tracks`);
  return fetch(`${SERVER}/api/tracks`)
    .then(res => res.json())
    .catch(err => console.log(`Error fetching tracks: ${err}`));
}

function getRacers() {
  return fetch(`${SERVER}/api/cars`)
    .then(res => res.json())
    .catch(err => console.log(`Error fetching racers: ${err}`));
}

async function createRace(player_id, track_id) {
  player_id = parseInt(player_id);
  track_id = parseInt(track_id);
  const body = { player_id, track_id };
  
  return fetch(`${SERVER}/api/races`, {
    method: 'POST',
    ...defaultFetchOpts(),
    body: JSON.stringify(body)
  })
    .then(res => res.json())
    .catch(err => console.error('Error creating race:', err));
}

async function getRace(id) {
  return await fetch(`${SERVER}/api/races/${id}`)
    .then(res => res.json())
    .catch(err => console.error("Error getting race:", err));
}

async function startRace(id) {
  try {
    const res = await fetch(`${SERVER}/api/races/${id}/start`, {
      method: 'POST',
      ...defaultFetchOpts(),
    });
    if (!res.ok) {
      throw new Error(`boss,HTTP error! status: ${res.status}`);
    }
  
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    console.log("boss,Problem with starting race:", err);
    throw err;
  }
}

async function accelerate() {
  if (!store.race_id) {
    console.error('boss,No active race to accelerate!');
    return;
  }
  try {
    await fetch(`${SERVER}/api/races/${store.race_id}/accelerate`, {
      method: 'POST',
      ...defaultFetchOpts()
    });
  } catch(err) {
    console.log(`Error accelerating racer:`, err);
  }
}
