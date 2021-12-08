# README
This implements the tools necessary for running the local console interface used to control the robot.

![Screenshot from 2021-12-07 19-33-48](https://user-images.githubusercontent.com/8033598/145127325-53ff0b26-ee75-4170-83e8-3db3542b9078.png)

## Architecture
This repo implements 3 components:
1. A socket-io server that runs locally on the machine which just relays messages received from clients to other clients.
2. An http server that serves the local console interface.
3. The web app interface which implements the GUI and which also has a socket-io client to send messages to the local server which will be relayed to the robot.

Number `1` and `2` are pretty simple since its job is just to relay messages. The `3` is the main component of this repo and the one that normally is modified to shape the local GUI to our needs. The code for this lives under the `public` folder.

## Requirements
* node
* npm

### Installing node and npm
The easiest way is to use `nvm` (node version manager)
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
source ~/.bashrc
```

Then simply install the node version you want. For our case the latest (v16.0.0) works
```
nvm install 16.0.0
```
 
## Dependencies
```bash
npm install
```

## Start Server
```
node index.js
```
