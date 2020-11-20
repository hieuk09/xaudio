import * as React from 'react';
import { render } from 'react-dom';
import axios from 'axios';
import classnames from 'classnames';
import './styles.scss';

import spinnerIcon from './images/spinner.svg';
import plusIcon from './images/plus.svg';
import checkIcon from './images/check.svg';
import playIcon from './images/play.svg';
import pauseIcon from './images/pause.svg';
import prevIcon from './images/skip-back.svg';
import nextIcon from './images/skip-forward.svg';
import deleteIcon from './images/delete.svg';

const savedState = window.localStorage.getItem('tubemusic-songs');
const initialMediaPlayerState = savedState ? JSON.parse(savedState) : {
  songs: [],
  player: {
    currentSongIndex: -1,
    playing: false
  }
};
const MediaPlayerContext = React.createContext({
  state: initialMediaPlayerState,
  dispatch: null
});
const MediaPlayerStateProvider = ({ children }) => {
  const [state, dispatch] = React.useReducer((state, action) => {
    switch (action.type) {
      case 'ADD_SONG':
        return {
          ...state,
          songs: state.songs.concat(action.value)
        };
      case 'REMOVE_SONG':
        return {
          ...state,
          songs: state.songs.filter(s => s.id !== action.value)
        };
      case 'PLAY_SONG':
        return {
          ...state,
          player: {
            currentSongIndex: action.value,
            playing: true
          }
        };
      case 'PAUSE_SONG':
        return {
          ...state,
          player: {
            ...state.player,
            playing: false
          }
        };
      case 'RANDOM_SONG':
        let randomIndex = ~~(Math.random() * (state.songs.length - 1));
        return {
          ...state,
          player: {
            currentSongIndex: randomIndex,
            playing: true
          }
        };
      case 'NEXT_SONG':
        let idx = state.player.currentSongIndex;
        if (idx + 1 < state.songs.length - 1) {
          idx += 1;
        } else {
          idx = 0;
        }
        return {
          ...state,
          player: {
            currentSongIndex: idx,
            playing: true
          }
        };
      case 'PREV_SONG':
        let pidx = state.player.currentSongIndex;
        if (pidx - 1 >= 0) {
          pidx -= 1;
        } else {
          pidx = state.songs.length - 1;
        }
        return {
          ...state,
          player: {
            currentSongIndex: pidx,
            playing: true
          }
        };
      default:
        throw new Error();
    }
  }, initialMediaPlayerState);

  React.useEffect(() => {
    // Remove the current playing state from saved state
    const stateToSave = {
      ...state,
      player: {
        currentSongIndex: -1,
        playing: false
      }
    };
    window.localStorage.setItem('tubemusic-songs', JSON.stringify(stateToSave));
  }, [ state ]);

  return <MediaPlayerContext.Provider value={{ state, dispatch }}>{children}</MediaPlayerContext.Provider>;
};


const pad = n => (n > 9 ? `${n}` : `0${n}`);
const durationDisplay = counter => {
  const days = ~~(counter / 86400);
  const remain = counter - days * 86400;
  const hrs = ~~(remain / 3600);
  const min = ~~((remain - hrs * 3600) / 60);
  const sec = ~~(remain % 60);
  return `${days > 0 ? days + ' days' : ''} ${hrs > 0 ? pad(hrs) + ':' : ''
    }${pad(min)}:${pad(sec)}`;
};

const API = {
  search: async (query) => {
    const result = await axios.get(`/api/search?query=${query}&limit=10`);
    return result?.data;
  },
  getUrl: async (song) => {
    const result = await axios.get(`/api/play?id=${song}`);
    return result?.data;
  }
};

const SearchEntries = ({ items }) => {
  const { state, dispatch } = React.useContext(MediaPlayerContext);

  const entryClickHandler = (item) => {
    dispatch({
      type: 'ADD_SONG',
      value: item
    });
  };

  const shouldDisabled = (item) => {
    const found = state.songs.find(s => s.id === item.id);
    return found !== undefined;
  };

  return items.map((item, i) => {
    const disabled = shouldDisabled(item);
    return (
      <li
        key={i}
        onClick={() => entryClickHandler(item)}
        className={classnames(
          "group p-3 border-b flex flex-row cursor-pointer hover:bg-gray-100",
          { "opacity-25 pointer-events-none": disabled }
        )}
      >
        <div className={classnames(
          "w-8 h-8 mr-2 flex items-center justify-center flex-shrink-0",
          { "group-hover:text-green-500": !disabled }
        )}>
          {disabled ? checkIcon() : plusIcon()}
        </div>
        <div className="flex-1">
          <div className="font-medium">{item.title}</div>
          <div className="flex flex-row text-sm text-gray-400">
            <div className="flex-1 text-left">{item.uploader}</div>
            <div className="flex-1 text-right font-medium">{durationDisplay(item.duration)}</div>
          </div>
        </div>
      </li>
    )
  });
};

const SearchArea = () => {
  const searchInputRef = React.useRef<HTMLInputElement>();
  const [loading, setLoading] = React.useState(false);
  const [searchResult, setSearchResult] = React.useState([]);

  const keyPressHandler = async (e) => {
    if (e.key === 'Enter') {
      const query = searchInputRef?.current?.value;
      if (query) {
        setLoading(true);
        const results = await API.search(query);
        setLoading(false);
        setSearchResult(results);
      }
    }
  };

  return (
    <div id="search-area" className="col-span-2 border-l">
      <input
        ref={searchInputRef}
        type="text"
        className="w-full p-3 border-b outline-none focus:ring-2 bg-gray-50"
        placeholder="Search by song title or artist..."
        onKeyPress={keyPressHandler}
      />
      {loading ? (
        <div className="animate-spin my-5 mx-auto h-5 w-5 text-black">
          {spinnerIcon()}
        </div>
      ) : (
        <ul>
          <SearchEntries items={searchResult} />
        </ul>
      )}
    </div >
  );
};

const MediaPlaylist = () => {
  const { state, dispatch } = React.useContext(MediaPlayerContext);

  const playClickHandler = (index) => {
    dispatch({
      type: 'PLAY_SONG',
      value: index
    });
  };

  const deleteClickHandler = (song) => {
    dispatch({
      type: 'REMOVE_SONG',
      value: song.id
    });
  };

  return (
    <ul>
      {state.songs.map((song, i) => {
        const isCurrent = state.player?.currentSongIndex === i;
        return (
          <li
            key={i}
            className={classnames(
              "group grid grid-cols-10 gap-2 border-b cursor-pointer",
              { "text-green-500": isCurrent },
              { "hover:bg-gray-50": !isCurrent }
            )}
            onDoubleClick={() => playClickHandler(i)}
          >
            <div className="p-2 col-span-6 font-medium flex flex-row">
              <div className="flex-shrink-0 mr-2 w-6 h-6 text-center items-center justify-center bg-gray-200">{i}</div>
              <div className="flex-1">{song.title}</div>
            </div>
            <div className="p-2 col-span-2">{song.uploader}</div>
            <div className="p-2 col-span-1">{durationDisplay(song.duration)}</div>
            <div className="p-2 col-span-1">
              <button
                className={classnames(
                  "w-8 h-8 opacity-10 group-hover:opacity-100 flex mx-auto items-center justify-center text-red-500",
                )}
                onClick={() => deleteClickHandler(song)}
              >
                {deleteIcon()}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

const AudioPlayer = () => {
  const { state, dispatch } = React.useContext(MediaPlayerContext);
  const playerRef = React.useRef<HTMLAudioElement>();
  const [songProgress, setSongProgress] = React.useState(0);
  const [duration, setDuration] = React.useState({
    current: 0,
    full: 0
  });

  const volumeUpHandler = () => {
    const player = playerRef?.current;
    if (player.volume < 1) {
      player.volume += 0.1;
    }
  }

  const volumeDownHandler = () => {
    const player = playerRef?.current;
    if (player.volume > 0) {
      player.volume -= 0.1;
    }
  }

  const nextSongHandler = () => {
    dispatch({
      type: 'NEXT_SONG'
    });
  }

  const prevSongHandler = () => {
    dispatch({
      type: 'NEXT_SONG'
    });
  }

  const randomSongHandler = () => {
    dispatch({
      type: 'RANDOM_SONG'
    });
  }

  const playPauseToggle = () => {
    const player = playerRef.current;
    if (player) {
      if (state.player.playing) {
        dispatch({
          type: 'PAUSE_SONG'
        });
        player.pause();
      } else {
        dispatch({
          type: 'PLAY_SONG'
        });
        player.play();
      }
    }
  };

  React.useEffect(() => {
    (async () => {
      console.log("DBG::I GOT THIS SONG PLAYED", state.player);
      if (state.player) {
        const song = state.songs[state.player.currentSongIndex];

        if (playerRef.current) {
          playerRef.current.pause();
        }

        const source = await API.getUrl(song.id);
        playerRef.current = new Audio(source.url);
        document.title = song.title;

        playerRef.current.addEventListener('timeupdate', (e) => {
          const player = playerRef.current;
          let percent = ~~(player.currentTime / player.duration * 100);
          setSongProgress(percent);
          setDuration({
            current: player.currentTime,
            full: player.duration
          });
          if (percent >= 100) {
            document.title = "Tubemusic";
            nextSongHandler();
          }
        });

        playerRef.current.play();
      }
    })();
  }, [state.player]);

  return (
    <div className="p-3 flex-1 flex flex-row items-center border-t">
      <button
        className="w-8 h-8 rounded-full mr-2 flex items-center justify-center border-gray-500 border-2 hover:bg-gray-100"
        onClick={prevSongHandler}
      >
        {prevIcon()}
      </button>
      <button
        className="w-12 h-12 rounded-full mr-2 flex items-center justify-center border-gray-500 border-2 hover:bg-gray-100"
        onClick={playPauseToggle}
      >
        {state.player?.playing ? pauseIcon() : playIcon()}
      </button>
      <button
        className="w-8 h-8 rounded-full mr-2 flex items-center justify-center border-gray-500 border-2 hover:bg-gray-100"
        onClick={nextSongHandler}
      >
        {nextIcon()}
      </button>
      <div className="flex-1 h-2 rounded-lg border-2 border-gray-500">
        <div className="h-full bg-gray-600" style={{width: `${songProgress}%`}}></div>
      </div>
      <div className="w-2/12 text-center text-sm text-gray-600 font-mono">{durationDisplay(duration.current)} / {durationDisplay(duration.full)}</div>
    </div>
  );
};

const MediaPlayerArea = () => {
  return (
    <div id="music-player" className="max-h-screen col-span-3 flex flex-col">
      <div id="playlist" className="flex-1 overflow-auto">
        <MediaPlaylist/>
      </div>
      <div id="player-control" className="h-16 flex">
        <AudioPlayer/>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <MediaPlayerStateProvider>
      <div id="main-container" className="w-screen h-screen grid grid-cols-5 gird-rows-1 gap-1">
        <MediaPlayerArea />
        <SearchArea />
      </div>
    </MediaPlayerStateProvider>
  );
};

render(<App/>, document.querySelector("#root"));