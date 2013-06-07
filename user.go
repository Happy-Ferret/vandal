package main

import (
	"code.google.com/p/go.net/websocket"
	"github.com/ugorji/go-msgpack"
	"strconv"
)

const (
	MAX_USERS_PER_LOCATION = 2
	MAX_NICKNAME_LENGTH    = 20
)

var userIdGenerator chan int

type User struct {
	Socket      *websocket.Conn
	SendEvent   chan<- []interface{}
	recv        <-chan []interface{}
	sendErr     chan error
	recvErr     chan error
	UserId      int
	Nickname    string
	Location    *Location
	MouseIsDown bool
	PositionX   int
	PositionY   int
	ColorRed    int
	ColorGreen  int
	ColorBlue   int
	UsePen      bool
	Kick        chan bool
}

func NewUser(ws *websocket.Conn) *User {
	user := new(User)
	user.Socket = ws
	user.UserId = <-userIdGenerator
	user.Nickname = strconv.Itoa(user.UserId)
	user.UsePen = true
	user.SendEvent, user.sendErr = sender(user.Socket)
	user.recv, user.recvErr = receiver(user.Socket)
	user.Kick = make(chan bool)
	return user
}

func init() {
	userIdGenerator = make(chan int)
	go func() {
		i := 1
		for {
			userIdGenerator <- i
			i += 1
		}
	}()
}

func encodeEvent(event []interface{}) ([]byte, error) {
	result, err := msgpack.Marshal(event)
	if err != nil {
		Log.Printf("Couldn't encode event '%v'\n", event)
	}
	return result, err
}

func (user *User) Error(description string) {
	Log.Printf("Error for user %v: %v\n", user.UserId, description)
	user.SendEvent <- []interface{}{
		EventTypeError,
		description,
	}
	user.Kick <- true
}

func (user *User) ErrorSync(description string) {
	Log.Printf("Error for user %v: %v\n", user.UserId, description)
	event := []interface{}{EventTypeError, description}
	data, err := encodeEvent(event)
	if err != nil {
		Log.Printf("Couldn't encode error event '%v': %v\n", event, err)
		return
	}
	err = websocket.Message.Send(user.Socket, data)
	if err != nil {
		Log.Printf("Couldn't send error event '%v': %v\n", event, err)
	}
}

func (user *User) mouseMove(x int, y int, duration int) {
	//    fmt.Printf("mouse move\n")
	if user.MouseIsDown {
		user.Location.DrawLine(
			user.PositionX, user.PositionY, // origin
			x, y, // destination
			duration,                                       // duration
			user.ColorRed, user.ColorGreen, user.ColorBlue, // color
			user.UsePen, // pen or eraser
		)
	}
	user.PositionX = x
	user.PositionY = y
}

func (user *User) mouseUp() {
	user.MouseIsDown = false
}

func (user *User) mouseDown() {
	user.MouseIsDown = true
}

func (user *User) changeTool(use_pen bool) {
	user.UsePen = use_pen
}

func (user *User) changeColor(red, green, blue int) {
	user.ColorRed = red
	user.ColorGreen = green
	user.ColorBlue = blue
}

func (user *User) changeNickname(nickname string, timestamp int64) {
	user.Location.Chat.AddMessage(timestamp, "", user.Nickname+" is now known as "+nickname)
	user.Nickname = nickname
}

func (user *User) chatMessage(msg string, timestamp int64) {
	user.Location.Chat.AddMessage(timestamp, user.Nickname, msg)
}

func (user *User) GotMessage(event []interface{}) []interface{} {
	event_type, err := ToInt(event[0])
	if err != nil {
		user.Error("Invalid event type")
		return nil
	}
	params := event[1:]
	switch event_type {
	case EventTypeMouseMove:
		p0, err0 := ToInt(params[0])
		p1, err1 := ToInt(params[1])
		p2, err2 := ToInt(params[2])
		if err0 != nil || err1 != nil || err2 != nil {
			user.Error("Invalid mouse move")
			return nil
		}
		user.mouseMove(p0, p1, p2)
	case EventTypeMouseUp:
		user.mouseUp()
	case EventTypeMouseDown:
		user.mouseDown()
	case EventTypeChangeTool:
		user.changeTool(params[0].(int8) != 0)
	case EventTypeChangeColor:
		p0, err0 := ToInt(params[0])
		p1, err1 := ToInt(params[1])
		p2, err2 := ToInt(params[2])
		if err0 != nil || err1 != nil || err2 != nil {
			user.Error("Invalid color")
			return nil
		}
		user.changeColor(p0, p1, p2)
	case EventTypeChangeNickname:
		timestamp := Timestamp()
		nickname := params[0].(string)
		if len(nickname) <= MAX_NICKNAME_LENGTH {
			user.changeNickname(params[0].(string), timestamp)
			event = append(event, timestamp)
		} else {
			user.Error("Nickname too long")
			return nil
		}
	case EventTypeChatMessage:
		timestamp := Timestamp()
		user.chatMessage(params[0].(string), timestamp)
		event = append(event, timestamp)
	}
	return event
}

func sender(ws *websocket.Conn) (chan<- []interface{}, chan error) {
	ch, errCh := make(chan []interface{}), make(chan error)
	go func() {
		for {
			event := <-ch
			data, err := encodeEvent(event)
			if err != nil {
				errCh <- err
				break
			}
			err = websocket.Message.Send(ws, data)
			if err != nil {
				errCh <- err
				break
			}
		}
		//        close(errCh)
	}()
	return ch, errCh
}

func receiver(ws *websocket.Conn) (<-chan []interface{}, chan error) {
	// receives and decodes messages from users
	ch, errCh := make(chan []interface{}), make(chan error)
	go func() {
		for {
			var data []byte
			var event []interface{}
			err := websocket.Message.Receive(ws, &data)
			if err != nil {
				errCh <- err
				break
			}
			err = msgpack.Unmarshal(data, &event, nil)
			if err != nil {
				errCh <- err
				break
			}
			ch <- event
		}
		//		Log.Printf("break nnnn\n")
		//	    close(errCh)
		//        close(ch)
	}()
	return ch, errCh
}

func (user *User) SocketHandler() {
	for {
		select {
		case event := <-user.recv:
			user.Location.Message <- UserAndEvent{user, event}
		case err := <-user.sendErr:
			Log.Printf("send error for user %v: %v\n", user.UserId, err)
			user.Location.Quit <- user
			return
		case err := <-user.recvErr:
			Log.Printf("recv error for user %v: %v\n", user.UserId, err)
			user.Location.Quit <- user
			return
		case <-user.Kick:
			Log.Printf("user %v was kicked\n", user.UserId)
			user.Location.Quit <- user
			return
		}
	}
}

//	var buffer []byte
//	for {
//		err := websocket.Message.Receive(user.Socket, &buffer)
//		if err != nil {
//			if err.Error() == "EOF" {
//				Log.Printf("User %v closed connection.\n", user.UserId)
//			} else {
//				Log.Printf("error while reading socket for user %v: %v\n", user.UserId, err)
//			}
//			break
//		}
//		var event []interface{}
//		err = msgpack.Unmarshal(buffer, &event, nil)
//		if err != nil {
//			Log.Printf("this is not msgpack: '%v' %v\n", buffer, err)
//			user.Error("Invalid message")
//		} else {
//			user.Location.Message <- UserAndEvent{user, event}
//		}
//	}
//	user.Location.Quit <- user
//	user.Socket.Close()
//}

//func (user *User) SocketHandlerOld() {
//	var buffer []byte
//	for {
//		err := websocket.Message.Receive(user.Socket, &buffer)
//		if err != nil {
//			if err.Error() == "EOF" {
//				Log.Printf("User %v closed connection.\n", user.UserId)
//			} else {
//				Log.Printf("error while reading socket for user %v: %v\n", user.UserId, err)
//			}
//			break
//		}
//		var event []interface{}
//		err = msgpack.Unmarshal(buffer, &event, nil)
//		if err != nil {
//			Log.Printf("this is not msgpack: '%v' %v\n", buffer, err)
//			user.Error("Invalid message")
//		} else {
//			user.Location.Message <- UserAndEvent{user, event}
//		}
//	}
//	user.Location.Quit <- user
//	user.Socket.Close()
//}
