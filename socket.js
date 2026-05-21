/* =========================================================
   INCLURA SOCKET.IO ENGINE
   Enterprise Realtime Infrastructure
   ========================================================= */

const { Server } = require("socket.io");

/* =========================================================
   ONLINE USERS STORE
========================================================= */

const onlineUsers = new Map();

/* =========================================================
   SOCKET INITIALIZER
========================================================= */

const initializeSocket = (server) => {

    const io = new Server(server, {

        cors: {

            origin: "*",

            methods: [

                "GET",

                "POST"

            ]

        }

    });

    /* =====================================================
       SOCKET CONNECTION
    ===================================================== */

    io.on(

        "connection",

        (socket) => {

            console.log(

                `User connected: ${socket.id}`

            );

            /* =============================================
               USER ONLINE
            ============================================= */

            socket.on(

                "user-online",

                (userId) => {

                    onlineUsers.set(

                        userId,

                        socket.id

                    );

                    io.emit(

                        "online-users",

                        Array.from(

                            onlineUsers.keys()

                        )

                    );

                    console.log(

                        `User online: ${userId}`

                    );

                }

            );

            /* =============================================
               PRIVATE MESSAGE
            ============================================= */

            socket.on(

                "send-message",

                (data) => {

                    const {

                        senderId,

                        receiverId,

                        message

                    } = data;

                    const receiverSocketId =
                        onlineUsers.get(

                            receiverId

                        );

                    if (receiverSocketId) {

                        io.to(

                            receiverSocketId

                        ).emit(

                            "receive-message",

                            {

                                senderId,

                                message,

                                createdAt:
                                    Date.now()

                            }

                        );

                    }

                }

            );

            /* =============================================
               TYPING INDICATOR
            ============================================= */

            socket.on(

                "typing",

                (data) => {

                    const {

                        senderId,

                        receiverId

                    } = data;

                    const receiverSocketId =
                        onlineUsers.get(

                            receiverId

                        );

                    if (receiverSocketId) {

                        io.to(

                            receiverSocketId

                        ).emit(

                            "typing",

                            {

                                senderId

                            }

                        );

                    }

                }

            );

            /* =============================================
               STOP TYPING
            ============================================= */

            socket.on(

                "stop-typing",

                (data) => {

                    const {

                        senderId,

                        receiverId

                    } = data;

                    const receiverSocketId =
                        onlineUsers.get(

                            receiverId

                        );

                    if (receiverSocketId) {

                        io.to(

                            receiverSocketId

                        ).emit(

                            "stop-typing",

                            {

                                senderId

                            }

                        );

                    }

                }

            );

            /* =============================================
               MESSAGE READ RECEIPT
            ============================================= */

            socket.on(

                "message-read",

                (data) => {

                    const {

                        senderId,

                        receiverId,

                        messageId

                    } = data;

                    const receiverSocketId =
                        onlineUsers.get(

                            senderId

                        );

                    if (receiverSocketId) {

                        io.to(

                            receiverSocketId

                        ).emit(

                            "message-read",

                            {

                                receiverId,

                                messageId

                            }

                        );

                    }

                }

            );

            /* =============================================
               REALTIME NOTIFICATIONS
            ============================================= */

            socket.on(

                "send-notification",

                (data) => {

                    const {

                        recipientId,

                        notification

                    } = data;

                    const recipientSocketId =
                        onlineUsers.get(

                            recipientId

                        );

                    if (recipientSocketId) {

                        io.to(

                            recipientSocketId

                        ).emit(

                            "receive-notification",

                            notification

                        );

                    }

                }

            );

            /* =============================================
               LIVESTREAM JOIN
            ============================================= */

            socket.on(

                "join-livestream",

                (data) => {

                    const {

                        livestreamId,

                        userId

                    } = data;

                    socket.join(

                        livestreamId

                    );

                    io.to(

                        livestreamId

                    ).emit(

                        "viewer-joined",

                        {

                            userId,

                            livestreamId

                        }

                    );

                }

            );

            /* =============================================
               LIVESTREAM LEAVE
            ============================================= */

            socket.on(

                "leave-livestream",

                (data) => {

                    const {

                        livestreamId,

                        userId

                    } = data;

                    socket.leave(

                        livestreamId

                    );

                    io.to(

                        livestreamId

                    ).emit(

                        "viewer-left",

                        {

                            userId,

                            livestreamId

                        }

                    );

                }

            );

            /* =============================================
               LIVESTREAM COMMENT
            ============================================= */

            socket.on(

                "livestream-comment",

                (data) => {

                    const {

                        livestreamId,

                        comment

                    } = data;

                    io.to(

                        livestreamId

                    ).emit(

                        "receive-livestream-comment",

                        comment

                    );

                }

            );

            /* =============================================
               LIVESTREAM REACTION
            ============================================= */

            socket.on(

                "livestream-reaction",

                (data) => {

                    const {

                        livestreamId,

                        reaction

                    } = data;

                    io.to(

                        livestreamId

                    ).emit(

                        "receive-livestream-reaction",

                        reaction

                    );

                }

            );

            /* =============================================
               WALLET ALERTS
            ============================================= */

            socket.on(

                "wallet-alert",

                (data) => {

                    const {

                        userId,

                        alert

                    } = data;

                    const socketId =
                        onlineUsers.get(

                            userId

                        );

                    if (socketId) {

                        io.to(

                            socketId

                        ).emit(

                            "wallet-alert",

                            alert

                        );

                    }

                }

            );

            /* =============================================
               SECURITY ALERTS
            ============================================= */

            socket.on(

                "security-alert",

                (data) => {

                    const {

                        userId,

                        alert

                    } = data;

                    const socketId =
                        onlineUsers.get(

                            userId

                        );

                    if (socketId) {

                        io.to(

                            socketId

                        ).emit(

                            "security-alert",

                            alert

                        );

                    }

                }

            );

            /* =============================================
               MENTORSHIP ALERTS
            ============================================= */

            socket.on(

                "mentorship-alert",

                (data) => {

                    const {

                        userId,

                        alert

                    } = data;

                    const socketId =
                        onlineUsers.get(

                            userId

                        );

                    if (socketId) {

                        io.to(

                            socketId

                        ).emit(

                            "mentorship-alert",

                            alert

                        );

                    }

                }

            );

            /* =============================================
               USER DISCONNECT
            ============================================= */

            socket.on(

                "disconnect",

                () => {

                    for (

                        const [

                            userId,

                            socketId

                        ] of onlineUsers.entries()

                    ) {

                        if (

                            socketId === socket.id

                        ) {

                            onlineUsers.delete(

                                userId

                            );

                            break;

                        }

                    }

                    io.emit(

                        "online-users",

                        Array.from(

                            onlineUsers.keys()

                        )

                    );

                    console.log(

                        `User disconnected: ${socket.id}`

                    );

                }

            );

        }

    );

    return io;

};

/* =========================================================
   EXPORT SOCKET
========================================================= */

module.exports = initializeSocket;
