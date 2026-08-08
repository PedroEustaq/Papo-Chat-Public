import { useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { View, TextInput, Button, StyleSheet, Text, StatusBar, Image, Touchable, TouchableOpacity } from "react-native";
import { getFriendRequests, acceptFriendRequest, sendFriendRequest, getProfileImage, rejectFriendRequest, getUserName, getSystemVersion } from "./FuncFirebase";
import { FlatList } from "react-native-gesture-handler";
import { useTheme } from './ThemeContext';
import VersionCheck from "./VersionCheck.js"; // Nova tela de chat privado

export default function PedidosAmizade({ navigation }) {
    const route = useRoute();
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const { currentUserId } = route.params
    const [pedidosAmizade, setPedidosAmizade] = useState([]);
    const [valorDigitadoPesquisaAmigo, setvalorDigitadoPesquisaAmigo] = useState("");
    const [imageUrls, setImageUrls] = useState([]);
    const [nomes, setNomes] = useState([]);




    useEffect(() => {
        const loadNames = async () => {
            const namesArray = [];
            for (const item of pedidosAmizade) {
                const nome = await getUserName(item);
                namesArray.push(nome);
            }
            setNomes(namesArray);
        };

        loadNames();
    }, [pedidosAmizade]);

    const fetchFriendRequests = async () => {
        const requests = await getFriendRequests(currentUserId);
        setPedidosAmizade(requests);
    };
    useEffect(() => {
        fetchFriendRequests()
    }, [currentUserId]);

    useEffect(() => {
        const loadImages = async () => {
            const images = [];
            for (const item of pedidosAmizade) {
                images.push(await getProfileImage(item));
            }
            setImageUrls(images);
        };

        loadImages();
    }, [pedidosAmizade]);



    const handleSendRequest = (CUID, VDPA) => {
        sendFriendRequest(CUID, VDPA);
        setvalorDigitadoPesquisaAmigo(''); // limpa o input
    };
    const handleReject = async (userId) => {
        await rejectFriendRequest(currentUserId, userId);
        fetchFriendRequests(); // Atualiza a lista
    };
    const handleAccept = async (userId) => {
        await acceptFriendRequest(currentUserId, userId);
        fetchFriendRequests(); // Atualiza a lista
    };
    return (

        <View style={[styles.pagina, isDarkMode ? { backgroundColor: theme.background } : { backgroundColor: theme.background }]}>
            <VersionCheck />
            <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'} // Muda o estilo do texto
                backgroundColor={isDarkMode ? '#1c1c1c' : '#fff'} // Cor de fundo
            />
            <View style={styles.cabeca}>
                <View style={{ width: '10%' }}>
                    <TouchableOpacity onPress={() => navigation.navigate('Chat')}>
                        <Image source={require("./icons/ArrowLeft.png")}
                            style={[styles.botaovoltar, isDarkMode ? {
                                tintColor: 'white'
                            } : { tintColor: 'black' }]} />
                    </TouchableOpacity>
                </View>
                <View style={{ width: '90%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', transform: [{ translateX: -20 }] }}>
                    <Image source={require("./icons/BalaoVerdin.png")} style={{
                        width: 32, height: 32,
                        transform: [{ translateX: 40 }]
                    }} />
                    <Image source={require("./decoracoes/Notificacoes.png")} style={[styles.notificaImg,
                    isDarkMode ? { tintColor: "white" } : { tintColor: "black" }
                    ]} />
                </View>

            </View>

            <View style={styles.pedidoRecebido}>
                <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                        <TextInput
                            style={[styles.input, isDarkMode ? { backgroundColor: '#2c2c2c', color: 'white' } : { backgroundColor: '#ddd', color: "black" }]}
                            placeholder="Digite o ID do contato"
                            value={valorDigitadoPesquisaAmigo}
                            onChangeText={setvalorDigitadoPesquisaAmigo}
                            placeholderTextColor={isDarkMode ? "white" : "black"}
                            multiline={false}
                        />
                        <TouchableOpacity
                            onPress={() => handleSendRequest(currentUserId, valorDigitadoPesquisaAmigo)}
                            style={[isDarkMode ? {
                                backgroundColor: '#3c3c3c'
                            } : {
                                backgroundColor: '#000'
                            }, {

                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: 50,
                                borderWidth: 0,
                                borderColor: '#00FF1E',
                                padding: 5,
                                marginLeft: 10,
                            }]}
                        >
                            <Image
                                style={{
                                    width: 30, height: 30, tintColor: "#00FF1E",
                                    transform: [{ scale: 0.7 }],

                                }}
                                source={require("./icons/AddIcon.png")}
                            />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={pedidosAmizade}
                        keyExtractor={(item) => item}
                        renderItem={({ item, index }) => (
                            <View style={styles.contatoNoti}>
                                {imageUrls[index] && imageUrls[index].uri ? (
                                    <Image
                                        style={{ width: 50, height: 50 }}
                                        source={{ uri: imageUrls[index].uri }}
                                    />
                                ) : (
                                    <Image source={require("./decoracoes/TravelerIcon.png")} style={{ width: 50, height: 50, transform: [{ translateX: 10 }] }} />
                                )}
                                <View style={{ flexDirection: "column", width: '90%', alignItems: 'center', justifyContent: 'space-between', height: "50%" }}>
                                    <Text style={{ color: isDarkMode ? 'white' : 'black', fontSize: 14, fontFamily: 'Inter-Regular' }}>{nomes[index] || 'Usuário'} mandou pedido de amizade</Text>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '90%', }}>
                                        <TouchableOpacity onPress={() => handleAccept(item)}>

                                            <Text style={{
                                                borderColor: '#04DF00',
                                                borderWidth: 1,
                                                backgroundColor: 'rgba(4, 223, 0, 0.11)',
                                                padding: 5,
                                                color: '#00B115',
                                                fontWeight: 800,
                                                fontFamily: 'Inter-Regular',
                                                borderRadius: 6,
                                                fontSize: 15,
                                                width: 146,
                                                padding: 5,
                                                textAlign: 'center',
                                            }}>Aceitar</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleReject(item)}>

                                            <Text style={{
                                                width: 146,
                                                borderColor: '#DF0000',
                                                borderWidth: 1,
                                                backgroundColor: 'rgba(223, 0, 0, 0.11)',
                                                borderRadius: 6,
                                                padding: 5,
                                                textAlign: "center",
                                                color: '#B10000',
                                                fontSize: 15,
                                                fontWeight: 800,
                                                fontFamily: 'Inter-Regular',
                                            }}>Negar</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                {
                                    //    <Button onPress={() => acceptFriendRequest(currentUserId, item)} title="AceitarPedido" />
                                    //<Button onPress={() => rejectFriendRequest(currentUserId, item)} title="RejeitarPedido" />
                                }
                            </View>
                        )}
                    />

                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    contatoNoti: {
        display: 'flex',
        position: 'relative',
        flexDirection: 'row',
        height: 120,
        alignItems: 'center',
    },
    notificaImg: {
        height: 59,
        width: 300,
        transform: [{ scale: 0.7 }, { translateX: 0 }],
    },
    title: {
        fontSize: 24,
        marginBottom: 10,
        fontFamily: "Poppins_400Regular",
        color: "black",
    },
    pagina: {
        flex: 1,
        padding: 10,
        backgroundColor: "#ffffff",
        color: 'black',
    },
    botao: {
        fontFamily: "Poppins_400Regular",
        backgroundColor: "red",
        color: "black",
    },
    cabeca: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        justifyContent: "flex-start",
        alignItems: "center",
    },
    addContactContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    input: {
        display: 'inline-block',
        borderColor: "#ccc",
        borderWidth: 0,
        borderRadius: 20,
        width: '75%',
        fontFamily: 'Inter-Regular',
        padding: 10,
        height: 40,
    },
    contactItem: {
        padding: 15,
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        alignItems: "center",
        justifyContent: "start",
        borderBottomColor: "#ddd",
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: "#2C2C2C",
    },
    configicon: {
        width: 35,
        height: 35,
    },
    imageOne: {
        width: 50,
        height: 50,
        borderRadius: 40,
    },
    contactName: {
        fontSize: 18,
        color: "#333",
        marginLeft: 10,
        fontFamily: "Poppins_400Regular",
        color: "white",
    },
    pedidoRecebido: {
    },
    botaovoltar: {
        height: 24, width: 24,
    }
});