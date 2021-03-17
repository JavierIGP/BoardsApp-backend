/*  
    Copyright (C) 2020 Javier Gómez
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
    
*/

const Board = require('../models/board')

const websocketController = {}

function broadcast(payload, req, sockets) {
    sockets[req.params.id].forEach((socket) => {
        try {
            socket.send(payload);
        } catch {
            console.log(`Error sending payload to socket on id: ${req.params.id}`)
        }
    }); 
};

websocketController.handle = async (msg, req, sockets, ws, cardsLock, onlineUsers, activeUsers, colors, userColors) => {

    let action = JSON.parse(msg)
    let board = await Board.findById(req.params.id)
    let updatedBoard;
    let uuid;

    switch(action.type){
        case 'MOVE':
            console.log('MOVE action on board ' + req.params.id)
            let sourceSection = action['sourceSection'];
            let targetSection = action['targetSection'];
            let sourceIndex = action['sourceIndex'];
            let targetIndex = action['targetIndex'];
            let cardUuid = board.data['sections'][sourceSection][sourceIndex];
            if (cardUuid == undefined || cardUuid == null) {
                console.error('[ERROR] null card detected');
                break;
            }
            if (sourceSection != targetSection){
                updatedBoard = Object.assign({}, board, {
                    data:{
                        'cards': board.data['cards'],
                        'sections': Object.assign({}, board.data['sections'], {
                            [sourceSection]: [
                                ...board.data['sections'][sourceSection].slice(0,sourceIndex),
                                ...board.data['sections'][sourceSection].slice(sourceIndex + 1)
                            ],
                            [targetSection]: [
                                ...board.data['sections'][targetSection].slice(0,targetIndex),
                                cardUuid,
                                ...board.data['sections'][targetSection].slice(targetIndex)
                            ]
                        })
                    }
                });
            }
            else {
                if (sourceIndex > targetIndex) {
                    updatedBoard = Object.assign({}, board, {
                        data: {
                            'cards': board.data['cards'],
                            'sections': Object.assign({}, board.data['sections'], {
                                [targetSection]: [
                                    ...board.data['sections'][targetSection].slice(0,targetIndex),
                                    cardUuid,
                                    ...board.data['sections'][targetSection].slice(targetIndex, sourceIndex),
                                    ...board.data['sections'][targetSection].slice(sourceIndex + 1)
                                ]
                            })
                        } 
                    });
                }
                else {
                    updatedBoard = Object.assign({}, board, {
                        data: {
                            'cards': board.data['cards'],
                            'sections': Object.assign({}, board.data['sections'], {
                                [targetSection]: [
                                    ...board.data['sections'][targetSection].slice(0,sourceIndex),
                                    ...board.data['sections'][targetSection].slice(sourceIndex + 1, targetIndex +1),
                                    cardUuid,
                                    ...board.data['sections'][targetSection].slice(targetIndex + 1)
                                ]
                            })
                        } 
                    });
                }

            }
            await Board.findByIdAndUpdate(req.params.id, {
                data: updatedBoard.data
            },
            { new: true })
            broadcast(msg, req, sockets);
            break;
        case 'DELETE':
            console.log('DELETE action on board ' + req.params.id)
            let sectionDelete = action['section'];
            let cardId = action['id'];
            let deleteIndex = board.data['sections'][sectionDelete].findIndex( el => el == cardId );
            let cardsCopy = Object.assign({}, board.data['cards'])
            delete cardsCopy[cardId]


            updatedBoard = Object.assign({}, board, {
                data: {
                    'cards': cardsCopy,
                    'sections': Object.assign({}, board.data['sections'], {
                        [sectionDelete]: [
                            ...board.data['sections'][sectionDelete].slice(0,deleteIndex),
                            ...board.data['sections'][sectionDelete].slice(deleteIndex + 1)
                        ]
                    })
                } 
            });
            await Board.findByIdAndUpdate(req.params.id, {
                data: updatedBoard.data
            },
            { new: true });
            broadcast(msg, req, sockets);
            break;
        case 'CREATE':
            console.log('CREATE action on board ' + req.params.id)
            let sectionNewCard = action['section'];
            let newCard = action['card'];
            uuid = action['card']['id'];
            updatedBoard = Object.assign({}, board, {
                data: {
                    cards: Object.assign({}, board.data['cards'], {
                        [uuid]: {
                            text: newCard['text'],
                            description: newCard['description']
                        }
                    }),
                    sections: Object.assign({}, board.data['sections'], {
                        [sectionNewCard]: [...board.data['sections'][sectionNewCard], uuid]
                    })
                }
            });
            await Board.findByIdAndUpdate(req.params.id, {
                data: updatedBoard.data
            },
            { new: true });
            broadcast(msg, req, sockets);
            break;
        case 'UPDATE_CARD':
            let card = action['cardId'];
            console.log('UPDATE_CARD action on board ' + req.params.id);
            updatedBoard = Object.assign({}, board, {
                data: {
                    cards: Object.assign({}, board.data['cards'], {
                        [card]: Object.assign({}, board.data['cards'][card], {
                            [action['field']]: action['data']
                        })
                    }),
                    sections: board.data['sections']
                }
            });
            await Board.findByIdAndUpdate(req.params.id, {
                data: updatedBoard.data
            },
            { new: true });
            broadcast(msg, req, sockets);
            break;
        case 'NAME':
            console.log('NAME action on board ' + req.params.id);
            updatedBoard = Object.assign({}, board, {
                name: action['value'],
            });
            await Board.findByIdAndUpdate(req.params.id, {
                name: updatedBoard.name
            },
            { new: true });
            broadcast(msg, req, sockets);
            break;
        case 'LOCK':
            console.log('LOCK action on board ' + req.params.id)
            cardsLock[req.params.id][action['cardId']] = action['email']
            broadcast(msg, req, sockets);
            break;
        case 'UNLOCK':
            console.log('UNLOCK action on board ' + req.params.id)
            if(cardsLock[req.params.id][action['cardId']['cardId']] === action['email']) {
                delete cardsLock[req.params.id][action['cardId']['cardId']]
            }
            broadcast(msg, req, sockets);
            break;
        case 'LOAD_BOARD':
            console.log('LOAD action on board ' + req.params.id)
            ws.send(JSON.stringify({
                type: 'LOAD_BOARD',
                board: board,
                wsId: ws.id,
                cardsLock: cardsLock[req.params.id],
                onlineUsers: onlineUsers[req.params.id],
            }))
            break;
        case 'ADD_USER':
            console.log('ADD_USER action on board ' + req.params.id)
            updatedBoard = Object.assign({}, board, {
                users: [
                    ...board.users,
                    action['email']
                ],
            });
            await Board.findByIdAndUpdate(req.params.id, {
                users: updatedBoard.users
            },
            { new: true });
            broadcast(msg, req, sockets);
            break;
        case 'USER_ONLINE':
            console.log('USER_ONLINE action on board ' + req.params.id)
            if (action['email'] !== '' && action['email'] !== undefined) {
                let flag = false
                for (var index = 0; index < userColors[req.params.id].length; index++) {
                    if (userColors[req.params.id][index] == 0){
                        userColors[req.params.id][index] = [action['email'], colors[index % colors.length],  action['photoUrl']]
                        flag = true
                        break;
                    }
                }
                if (!flag) {
                    userColors[req.params.id].push([action['email'], colors[userColors[req.params.id].length % colors.length], action['photoUrl']])
                }
                onlineUsers[req.params.id].push(action['email']);
                activeUsers[ws.id] = action['email'];
                action['userColors'] = userColors[req.params.id];
                broadcast(JSON.stringify(action),req,sockets);
            }
            break;
        case 'USER_OFFLINE':
            console.log('USER_OFFLINE action on board ' + req.params.id)
            const userIndex = onlineUsers[req.params.id].findIndex(el => el === action['email']);
            const userColorIndex = userColors[req.params.id].findIndex(el => el[0] === action['email'])
            userColors[req.params.id][userColorIndex] = 0    
            onlineUsers[req.params.id].splice(userIndex, 1);
            broadcast(msg,req,sockets);
            break;
        default:
            console.error('Action type not allowed or undefined')
    }
}

module.exports = websocketController;
