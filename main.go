package main

import (
	"code.google.com/p/go.net/websocket"
	"flag"
	"fmt"
	"github.com/ugorji/go-msgpack"
	"html/template"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"sync"
	"time"
)

const (
	CHAT_DIR   = "chat"
	IMAGES_DIR = "img"
	LOG_DIR    = "log"
	STATIC_DIR = "static"
)

var (
	port                 *int  = flag.Int("p", 8000, "Port to listen.")
	foreground           *bool = flag.Bool("f", false, "Log on stdout.")
	sockets_wait         sync.WaitGroup
	index_template       = template.Must(template.ParseFiles("templates/index.html"))
	currently_used_sites []Website
	Log                  *log.Logger
)

func socket_handler(ws *websocket.Conn) {
	sockets_wait.Add(1)

	user := NewUser(ws)

	// Retrieve the site the user wants to draw over:
	location_url, err := url.QueryUnescape(ws.Request().RequestURI[6:]) // skip "/ws?u="
	if err != nil {
		user.Error("Invalid query")
		sockets_wait.Done()
		return
	}

	LocationsMutex.Lock()
	location := GetLocation(location_url)
	LocationsMutex.Unlock()

	user.Location = location
	user.Location.Mutex.Lock()
	if len(location.Users) >= MAX_USERS_PER_LOCATION {
		user.Error("Too much users at this location, try adding #something at the end of the URL.")
		user.Location.Mutex.Unlock()
		sockets_wait.Done()
		return
	}
	Log.Println("New user", user.UserId, "joins", user.Location.Url)
	user.Location.AddUser(user)
	user.OnOpen()
	user.Location.Mutex.Unlock()

	for {
		var buf []byte
		err := websocket.Message.Receive(ws, &buf)
		if err != nil {
			if err.Error() == "EOF" {
				Log.Printf("User %v closed connection.\n", user.UserId)
			} else {
				Log.Printf("error while reading socket for user %v: %v\n", user.UserId, err)
			}
			break
		}
		var v []interface{}
		err = msgpack.Unmarshal(buf, &v, nil)
		if err != nil {
			Log.Printf("this is not msgpack: '%v'\n", buf)
			user.Error("Invalid message")
		} else {
			user.Location.Mutex.Lock()
			user.GotMessage(v)
			user.Location.Mutex.Unlock()
		}
	}
	user.Location.Mutex.Lock()
	user.OnClose()
	user.Location.Mutex.Unlock()
	ws.Close()
	sockets_wait.Done()
}

func signal_handler(c chan os.Signal) {
	Log.Printf("signal %v\n", <-c)
	LocationsMutex.Lock()
	for _, loc := range Locations {
		loc.Mutex.Lock()
		for _, user := range loc.Users {
			user.Socket.Close()
		}
		loc.Mutex.Unlock()
	}
	LocationsMutex.Unlock()
	sockets_wait.Wait() // Wait until all websockets are closed
	// Why do we become a daemon here ?
	Log.Printf("exit\n")
	os.Exit(0)
}

func init() {
	os.MkdirAll(CHAT_DIR, 0777)
	os.MkdirAll(IMAGES_DIR, 0777)
	os.MkdirAll(LOG_DIR, 0777)
	flag.Parse()
	now := time.Now()
	var log_file io.Writer
	var err error
	if *foreground == true {
		log_file = os.Stdout
	} else {
		log_file, err = os.Create(LOG_DIR + "/" + now.Format("2006-01-02_15:04:05"))
		if err != nil {
			fmt.Println(err)
			panic("Couldn't open log file.")
		}
	}
	Log = log.New(log_file, "", log.LstdFlags)
}

func index_handler(w http.ResponseWriter, r *http.Request) {
	err := index_template.Execute(w, currently_used_sites)
	if err != nil {
		Log.Printf("Couldn't execute template: %v\n", err)
	}
}

func save_all_locations() {
	LocationsMutex.Lock()
	for _, location := range Locations {
		location.Mutex.Lock()
		location.Save()
		if len(location.Users) == 0 {
			delete(Locations, location.Url)
			location.Surface.Finish()
			location.Surface.Destroy()
		}
		location.Mutex.Unlock()
	}
	LocationsMutex.Unlock()
}

func update_currently_used_sites() {
	var sites []Website
	LocationsMutex.RLock()
	for _, location := range Locations {
		location.Mutex.RLock()
		length := len(location.Users)
		if length > 0 {
			sites = append(sites, Website{Url: location.Url, UserCount: length})
		}
		location.Mutex.RUnlock()
	}
	LocationsMutex.RUnlock()
	SortWebsites(sites)
	currently_used_sites = sites[:MinInt(len(sites), 10)]
}

func main() {
	SignalChan := make(chan os.Signal)
	go signal_handler(SignalChan)
	signal.Notify(SignalChan, os.Interrupt, os.Kill)

	go func() {
		tick := time.Tick(10 * time.Second)
		for _ = range tick {
			update_currently_used_sites()
		}
	}()

	go func() {
		tick := time.Tick(1 * time.Minute)
		for _ = range tick {
			save_all_locations()
		}
	}()

	http.Handle("/ws", websocket.Handler(socket_handler))
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(STATIC_DIR))))
	http.Handle("/img/", http.StripPrefix("/img/", http.FileServer(http.Dir(IMAGES_DIR))))
	http.Handle("/", http.HandlerFunc(index_handler))
	Log.Printf("Listening on port %d\n", *port)
	err := http.ListenAndServe(fmt.Sprintf(":%d", *port), nil)
	if err != nil {
		panic("ListenAndServe: " + err.Error())
	}
}
