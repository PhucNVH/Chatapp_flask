
import asyncio
import json
import logging
import websockets
import random
import string
import socket
USERS = list()


def startWS():
    addr = socket.gethostbyname(socket.gethostname())
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    logging.basicConfig()
    port = 4200
    start_server = websockets.serve(counter, addr, port)
    print("websocket server's running on "+str(addr)+":"+str(port))
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()


def findClient(id, userList):
    for user in userList[::-1]:
        if user['socketID'] == id:
            return user['socket']


def randomString(stringLength=2):
    letters = string.ascii_lowercase
    return ''.join(random.sample(letters, stringLength))


def state_event():
    return json.dumps({"type": "state"})


def users_event():
    return json.dumps({"type": "users", "count": len(USERS)})


async def notify_state():
    if USERS:  # asyncio.wait doesn't accept an empty list
        message = state_event()

        await asyncio.wait([user['socket'].send(message) for user in USERS])


async def notify_users(id):
    if USERS:  # asyncio.wait doesn't accept an empty list
        message = json.dumps({"type": "message",
                              "content": "user " + id + " has been connected"})
        print(USERS)
        await asyncio.wait([user['socket'].send(message) for user in USERS])


async def login(websocket, id):
    for user in USERS:
        print(user['socketID'])
        if user['socketID'] == id:
            conn = findClient(id, USERS)
            if conn:
                await conn.send(json.dumps(
                    {"type": "userConnect", "message": "Connection interrupted"}))
                await conn.close()
    #             # USERS.remove({"socketID": id, "socket": conn})
    USERS.append({"socketID": id, "socket": websocket})
    await websocket.send(json.dumps({"type": "connect", "id": id}))
    if USERS:
        message = json.dumps({"type": "notify",
                              "message": "user " + id + " has been connected",
                              "username": id,
                              "status": "online"})
        print(USERS)
        await asyncio.wait([user['socket'].send(message) for user in USERS])


async def unlogin(websocket, id):
    USERS.remove({"socketID": id, "socket": websocket})
    if USERS:
        message = json.dumps({"type": "notify",
                              "message": "user " + id + " has been disconnected", "username": id,
                              "status": "offline"})
        print(USERS)
        await asyncio.wait([user['socket'].send(message) for user in USERS])


async def counter(websocket, path):
    # login(websocket) sends user_event() to websocket
    socketID = randomString(4)
    init = await websocket.recv()
    initData = json.loads(init)
    await login(websocket, initData['username'])
    try:
        await websocket.send(state_event())
        async for message in websocket:
            data = json.loads(message)
            if(data['type'] == "onlineState"):
                usersOnline = [user['socketID'] for user in USERS]
                onlineState = {'type': 'onlineState',
                               'usersOnline': usersOnline}
                await websocket.send(json.dumps(onlineState))
            else:
                sk = findClient(data['username'], USERS)
                if(sk):
                    await sk.send(message)
    finally:
        await unlogin(websocket, initData['username'])
