import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, TextInput, Alert, StatusBar, ScrollView } from "react-native";
import { auth, db } from "./firebase";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Clipboard from 'expo-clipboard';
import { deleteUserCompletely, getContacts, getUserName, getProfileImage, removeFriend, getUserCustomId, pickImageAndConvertToBase64, updateProfileImage, getSystemVersion } from "./FuncFirebase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import VersionCheck from "./VersionCheck.js"; // Nova tela de chat privado
import { useTheme } from './ThemeContext';

export default function ConfigPainel() {
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const [userData, setUserData] = useState({
        name: '',
        id: '',
        profileImg: null
    });

    const route = useRoute();
    const [mostrarPainel, setMostrarPainel] = useState(false);
    const [mostrarPainelDecoracoes, setMostrarPainelDecoracoes] = useState(false);
    const [mostrarPainelBloqueados, setMostrarPainelBloqueados] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [userNameList, setUserNameList] = useState([]);
    const [imageUrls, setImageUrls] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [filteredContacts, setFilteredContacts] = useState([]);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [blockedUserNames, setBlockedUserNames] = useState([]);
    const [blockedUserImages, setBlockedUserImages] = useState([]);
    const navigation = useNavigation();
    const currentUserId = route.params.currentUserId;
    const [username, setUsername] = useState("");
    const [isEditingName, setIsEditingName] = useState(false);
    const [newUsername, setNewUsername] = useState("");

    //Copiar ID para o clipboard
    const copyToClipboard = () => {
        if (userData?.id) {
            Clipboard.setStringAsync(userData.id);
            alert("ID copiado!");
        }
    };

    // Função para buscar os contatos
    const fetchContacts = async () => {
        const fetchedContacts = await getContacts();
        setContacts(fetchedContacts);

        const nomes = [];
        const images = [];

        for (const contact of fetchedContacts) {
            const nome = await getUserName(contact);
            const image = await getProfileImage(contact);
            nomes.push(nome);
            images.push(image);
        }

        setUserNameList(nomes);
        setImageUrls(images);
        setFilteredContacts(fetchedContacts);
    };

    // Função para filtrar contatos
    const filterContacts = (text) => {
        setSearchText(text);
        if (text === '') {
            setFilteredContacts(contacts);
            return;
        }

        const filtered = contacts.filter((_, index) => {
            const userName = userNameList[index]?.toLowerCase() || '';
            return userName.includes(text.toLowerCase());
        });

        setFilteredContacts(filtered);
    };

    const handleLogout = async () => {
        try {
            await auth.signOut();
            await AsyncStorage.removeItem('isLoggedIn');
            await AsyncStorage.removeItem('userEmail');
            await AsyncStorage.removeItem('userPassword');
            await AsyncStorage.removeItem('userData');
            await AsyncStorage.removeItem('username');
            await AsyncStorage.removeItem('contacts');
            await AsyncStorage.removeItem('userNames');
            await AsyncStorage.removeItem('imageUrls');
            await AsyncStorage.removeItem('ultimasMSGS');
            await AsyncStorage.removeItem('timestamps');
            await AsyncStorage.removeItem('lastSent');
            navigation.replace('Login');
        } catch (error) {
            Alert.alert("Erro", "Não foi possível fazer logout: " + error.message);
        }
    };

    // Função para buscar usuários bloqueados
    const fetchBlockedUsers = async () => {
        try {
            const userRef = doc(db, "users", currentUserId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const blockedContacts = userSnap.data().blockedContacts || [];
                setBlockedUsers(blockedContacts);

                const nomes = [];
                const images = [];

                for (const blockedId of blockedContacts) {
                    const nome = await getUserName(blockedId);
                    const image = await getProfileImage(blockedId);
                    nomes.push(nome);
                    images.push(image);
                }

                setBlockedUserNames(nomes);
                setBlockedUserImages(images);
            }
        } catch (error) {
            console.error("Erro ao buscar usuários bloqueados:", error);
        }
    };

    const handleUpdateProfileImage = async () => {
        try {
            const base64Image = await pickImageAndConvertToBase64();
            if (base64Image) {
                // Atualiza a imagem no Firestore
                const userRef = doc(db, "users", currentUserId);
                await updateDoc(userRef, {
                    profileImg: base64Image
                });

                // Atualiza o estado local
                setUserData(prev => ({
                    ...prev,
                    profileImg: base64Image
                }));

                // Atualiza o AsyncStorage
                const updatedUserData = {
                    ...userData,
                    profileImg: base64Image
                };
                await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));

                Alert.alert("Sucesso", "Foto de perfil atualizada com sucesso!");
            }
        } catch (error) {
            console.error("Erro ao atualizar foto de perfil:", error);
            Alert.alert("Erro", "Não foi possível atualizar a foto de perfil.");
        }
    };

    const handleUpdateUsername = async () => {
        try {
            if (!newUsername.trim()) {
                Alert.alert("Erro", "O nome de usuário não pode estar vazio!");
                return;
            }

            const userRef = doc(db, "users", currentUserId);
            await updateDoc(userRef, {
                name: newUsername
            });

            setUsername(newUsername);
            await AsyncStorage.setItem('username', newUsername);
            setIsEditingName(false);
            Alert.alert("Sucesso", "Nome de usuário atualizado com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar nome de usuário:", error);
            Alert.alert("Erro", "Não foi possível atualizar o nome de usuário.");
        }
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const user = currentUserId;

            // Tenta recuperar dados do AsyncStorage primeiro
            const storedUserData = await AsyncStorage.getItem('userData');
            if (storedUserData) {
                setUserData(JSON.parse(storedUserData));
            }

            if (user) {
                const userDocRef = doc(db, "users", user);
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    setUserData(userData);
                    // Armazena os novos dados no AsyncStorage
                    await AsyncStorage.setItem('userData', JSON.stringify(userData));
                }
            }
        };

        fetchUserData();
    }, []);

    useEffect(() => {
        if (mostrarPainel) {
            fetchContacts();
        }
    }, [mostrarPainel]);

    useEffect(() => {
        const fetchCustomId = async () => {
            if (currentUserId) {

                const storedUsername = await AsyncStorage.getItem('username');
                if (storedUsername) {
                    setUsername(storedUsername);
                }

                const username = await getUserName(currentUserId);
                setUsername(username);
                await AsyncStorage.setItem('username', username);
            }

        };
        fetchCustomId();
    }, [currentUserId]);

    useEffect(() => {
        if (mostrarPainelBloqueados) {
            fetchBlockedUsers();
        }
    }, [mostrarPainelBloqueados]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <VersionCheck/>
            <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'} // Muda o estilo do texto
                backgroundColor={isDarkMode ? '#1c1c1c' : '#fff'} // Cor de fundo
            />
            {/* Header */}
            <View style={[styles.header, isDarkMode ? { backgroundColor: theme.cardBackground } : { backgroundColor: 'white', }]}>
                <TouchableOpacity
                    style={{
                        justifyContent: "flex-start",
                        alignItems: "flex-start"
                    }}
                    onPress={() => navigation.goBack()}>
                    <Image
                        source={require("./icons/ArrowLeft.png")}
                        style={[styles.backButton, { tintColor: theme.text }]}
                    />
                </TouchableOpacity>
                <View style={{
                    flexDirection: 'row',
                    justifyContent: "center",
                    alignItems: "center",
                    flex: 1,
                    transform: [{ translateX: -10 }],
                }}>
                    <Image source={require("./icons/BalaoVerdin.png")} style={{ width: 36, height: 36, transform: [{ translateY: 3 }], marginRight: 5 }} />
                    <Image
                        source={require("./decoracoes/Minha Conta.png")}
                        style={
                            [styles.MinhaConta,

                            isDarkMode ? {
                                tintColor: theme.text

                            }
                                :
                                {
                                    tintColor: theme.text,

                                }]}

                    />
                </View>
            </View>

            {/* Perfil do Usuário */}
            <View style={[styles.profileContainer, { backgroundColor: theme.cardBackground }]}>
                <View style={styles.profileContent}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={
                                userData.profileImg && userData.profileImg.startsWith('data:image')
                                    ? { uri: userData.profileImg }
                                    : require("./decoracoes/TravelerIcon.png")
                            }
                            style={styles.avatar}
                        />
                        <TouchableOpacity
                            style={[styles.editButton, { backgroundColor: theme.cardBackground }]}
                            onPress={() => setMostrarPainelDecoracoes(true)}
                        >
                            <Image
                                source={require("./icons/Varinha.png")}
                                style={styles.editIcon}
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.userInfo}>
                        <View style={styles.usernameContainer}>
                            {isEditingName ? (
                                <View style={styles.editUsernameContainer}>
                                    <TextInput
                                        style={[styles.usernameInput, { 
                                            color: "black",
                                            backgroundColor: "#56F977",
                                            borderColor: theme.borderColor, 
                                            borderRadius: 30,
                                            marginRight: 10,
                                            fontWeight: 700,
                                        }]}
                                        value={newUsername}
                                        onChangeText={setNewUsername}
                                        placeholder="Novo nome de usuário"
                                        placeholderTextColor={"#000"}
                                    />
                                    <TouchableOpacity
                                        style={[styles.saveUsernameButton, { backgroundColor: theme.primary }]}
                                        onPress={handleUpdateUsername}
                                    >
                                        <Text style={[styles.saveUsernameText, { color: theme.text }]}>Salvar</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.usernameDisplayContainer}>
                                    <Text style={[styles.userName, { color: theme.text }]}>{username}</Text>
                                    <TouchableOpacity
                                        style={styles.editUsernameIcon}
                                        onPress={() => {
                                            setNewUsername(username);
                                            setIsEditingName(true);
                                        }}
                                    >
                                        <Image
                                            source={require("./icons/Caneta.png")}
                                            style={[styles.editIcon, { tintColor: theme.text }]}
                                        />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                        <View style={styles.idContainer}>
                            <Text style={[styles.userId, { color: theme.text }]}>{currentUserId}</Text>
                            <TouchableOpacity onPress={copyToClipboard}>
                                <Image
                                    source={require("./icons/CopyIcon.png")}
                                    style={[styles.copyIcon, { tintColor: theme.text }]}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* Seção de Interesses 
            <TouchableOpacity style={[styles.interestsSection, { backgroundColor: theme.cardBackground }]}>
                <Text style={[styles.interestsText, { color: theme.text }]}>Interesses</Text>
                <Text style={[styles.plusIcon, { color: theme.text }]}>+</Text>
            </TouchableOpacity>
*/}
            {/* Botões de Ação */}
            <ScrollView
                style={styles.actionsContainer}
                contentContainerStyle={styles.actionsContentContainer}
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity
                    style={[styles.removeFriendsButton, { backgroundColor: '#FF6B6B' }]}
                    onPress={() => setMostrarPainel(true)}
                >
                    <Image
                        source={require("./icons/RemoveAmiza.png")}
                        style={[styles.trashIcon, { tintColor: 'white' }]}
                    />
                    <Text style={[styles.buttonText, { color: 'white' }]}>Remover Amizades</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.blockedUsersButton, { backgroundColor: '#FF9F43' }]}
                    onPress={() => setMostrarPainelBloqueados(true)}
                >
                    <Image
                        source={require("./icons/Blockicon.png")}
                        style={[styles.trashIcon, { tintColor: 'white' }]}
                    />
                    <Text style={[styles.buttonText, { color: 'white' }]}>Usuários Bloqueados</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.themeButton, { backgroundColor: '#4ECDC4' }]}
                    onPress={() => navigation.navigate('TrocarEmail')}
                >
                    <Image
                        source={require("./icons/CopyIcon.png")}
                        style={[styles.themeIcon, { tintColor: 'white' }]}
                    />
                    <Text style={[styles.buttonText, { color: 'white' }]}>Trocar e-mail</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.themeButton, { backgroundColor: '#6C63FF' }]}
                    onPress={() => navigation.navigate('TrocarSenha')}
                >
                    <Image
                        source={require("./icons/Blockicon.png")}
                        style={[styles.themeIcon, { tintColor: 'white' }]}
                    />
                    <Text style={[styles.buttonText, { color: 'white' }]}>Trocar senha</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.themeButton, { backgroundColor: '#4ECDC4' }]}
                    onPress={toggleTheme}
                >
                    <Image
                        source={isDarkMode ? require("./icons/sun.png") : require("./icons/moon.png")}
                        style={[styles.themeIcon, { tintColor: 'white' }]}
                    />
                    <Text style={[styles.buttonText, { color: 'white' }]}>Mudar Tema</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.logoutButton, { backgroundColor: '#45B7D1' }]}
                    onPress={handleLogout}
                >
                    <Image
                        source={require("./icons/logout.png")}
                        style={[styles.logoutIcon, { tintColor: 'white' }]}
                    />
                    <Text style={[styles.buttonText, { color: 'white' }]}>Fazer logout</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.deleteAccountButton, { backgroundColor: '#FF4757' }]}
                    onPress={() => {
                        deleteUserCompletely(userData.id);
                        navigation.navigate('Login');
                    }}
                >
                    <Image
                        source={require("./icons/LataLixoBranca.png")}
                        style={[styles.trashIcon, { tintColor: 'white' }]}
                    />
                    <Text style={[styles.buttonText, { color: 'white' }]}>Deletar conta</Text>
                </TouchableOpacity>
            </ScrollView>
            {mostrarPainel && (
                <View style={[styles.friendsPanel, { backgroundColor: theme.background }]}>
                    <View style={[styles.panelHeader, { backgroundColor: theme.cardBackground }]}>
                        <Text style={[styles.panelTitle, { color: theme.text }]}>Remover Amizades</Text>
                        <TouchableOpacity onPress={() => setMostrarPainel(false)}>
                            <Text style={[styles.closeButton, { color: theme.text }]}>X</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <TextInput
                            style={[styles.searchInput, {
                                backgroundColor: theme.inputBackground,
                                color: theme.text,
                                borderColor: theme.borderColor
                            }]}
                            placeholder="Buscar amigo por nome..."
                            placeholderTextColor={theme.text}
                            value={searchText}
                            onChangeText={filterContacts}
                        />
                    </View>

                    <FlatList
                        data={filteredContacts}
                        keyExtractor={(item) => item}
                        renderItem={({ item, index }) => {
                            const originalIndex = contacts.indexOf(item);
                            return (
                                <View style={[styles.friendItem, {
                                    backgroundColor: theme.cardBackground,
                                    borderBottomColor: theme.borderColor
                                }]}>
                                    <Image
                                        source={
                                            imageUrls[originalIndex] && imageUrls[originalIndex].uri
                                                ? { uri: imageUrls[originalIndex].uri }
                                                : require("./decoracoes/TravelerIcon.png")
                                        }
                                        style={styles.friendAvatar}
                                    />
                                    <Text style={[styles.friendName, { color: theme.text }]}>{userNameList[originalIndex]}</Text>
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => {
                                            removeFriend(currentUserId, item);
                                            fetchContacts();
                                        }}
                                    >
                                        <Image
                                            source={require("./icons/Skull.png")}
                                            style={styles.skullIcon}
                                        />
                                    </TouchableOpacity>
                                </View>
                            );
                        }}
                    />
                </View>
            )}

            {/* Painel de Usuários Bloqueados */}
            {mostrarPainelBloqueados && (
                <View style={[styles.friendsPanel, { backgroundColor: theme.background }]}>
                    <View style={[styles.panelHeader, { backgroundColor: theme.cardBackground }]}>
                        <Text style={[styles.panelTitle, { color: theme.text }]}>Usuários Bloqueados</Text>
                        <TouchableOpacity onPress={() => setMostrarPainelBloqueados(false)}>
                            <Text style={[styles.closeButton, { color: theme.text }]}>X</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={blockedUsers}
                        keyExtractor={(item) => item}
                        renderItem={({ item, index }) => (
                            <View style={[styles.friendItem, {
                                backgroundColor: theme.cardBackground,
                                borderBottomColor: theme.borderColor
                            }]}>
                                <Image
                                    source={
                                        blockedUserImages[index] && blockedUserImages[index].uri
                                            ? { uri: blockedUserImages[index].uri }
                                            : require("./decoracoes/TravelerIcon.png")
                                    }
                                    style={styles.friendAvatar}
                                />
                                <Text style={[styles.friendName, { color: theme.text }]}>{blockedUserNames[index]}</Text>
                                <TouchableOpacity
                                    style={styles.unblockButton}
                                    onPress={async () => {
                                        const userRef = doc(db, "users", currentUserId);
                                        const blockedRef = doc(db, "users", item);

                                        await updateDoc(userRef, {
                                            blockedContacts: arrayRemove(item)
                                        });

                                        await updateDoc(blockedRef, {
                                            blockedContacts: arrayRemove(currentUserId)
                                        });

                                        fetchBlockedUsers();
                                    }}
                                >
                                    <Image
                                        source={require("./icons/Skull.png")}
                                        style={styles.skullIcon}
                                    />
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                </View>
            )}

            {mostrarPainelDecoracoes && (
                <View style={[styles.decoracoesPanel, { backgroundColor: theme.background }]}>
                    <View style={[styles.decoracoesContent, { backgroundColor: theme.cardBackground }]}>
                        {/* Seção Foto de Perfil */}
                        <View style={[styles.sectionContainer, { backgroundColor: theme.cardBackground }]}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Modificar foto de perfil</Text>
                            <View style={styles.imageContainer}>
                                <TouchableOpacity
                                    style={styles.closeButtonContainer}
                                    onPress={() => setMostrarPainelDecoracoes(false)}
                                >
                                    <Image
                                        source={require("./icons/CloseIcon.png")}
                                        style={[styles.closeButton, { tintColor: isDarkMode ? "white" : "black" }]}
                                    />
                                </TouchableOpacity>
                                <View style={[styles.profileImageContainer, { backgroundColor: theme.inputBackground }]}>

                                    <Image
                                        source={
                                            userData.profileImg && userData.profileImg.startsWith('data:image')
                                                ? { uri: userData.profileImg }
                                                : require("./decoracoes/TravelerIcon.png")
                                        }
                                        style={styles.previewImage}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[styles.uploadButton, { backgroundColor: theme.primary }]}
                                    onPress={handleUpdateProfileImage}
                                >
                                    <Text style={[styles.uploadButtonText, { color: theme.text }]}>Atualizar foto</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 16,
        backgroundColor: '#fff',
        height: 70,
    },
    backButton: {
        width: 24,
        height: 24,
        marginRight: 16,
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    profileContainer: {
        backgroundColor: '#f5f5f5',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 16,
    },
    profileContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    editButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 4,
    },
    editIcon: {
        width: 16,
        height: 16,
    },
    userInfo: {
        marginLeft: 16,
        flex: 1,
    },
    usernameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editUsernameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    usernameInput: {
        flex: 1,
        padding: 8,
    },
    saveUsernameButton: {
        padding: 8,
        backgroundColor: '#4169E1',
        borderRadius: 10,
    },
    saveUsernameText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    usernameDisplayContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    idContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    userId: {
        fontSize: 14,
        color: '#666',
        marginRight: 8,
    },
    copyIcon: {
        width: 16,
        height: 16,
    },
    interestsSection: {
        marginHorizontal: 16,
        marginTop: 24,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    interestsText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    plusIcon: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    logoutButton: {
        marginHorizontal: 16,
        marginTop: 24,
        padding: 16,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    logoutIcon: {
        width: 20,
        height: 20,
        marginRight: 8,
    },
    removeFriendsButton: {
        marginHorizontal: 16,
        marginTop: 24,
        padding: 16,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    blockedUsersButton: {
        marginHorizontal: 16,
        marginTop: 12,
        padding: 16,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    deleteAccountButton: {
        marginHorizontal: 16,
        marginTop: 12,
        padding: 16,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
        fontFamily: 'Inter-Regular',
    },
    actionsContainer: {
        flex: 1,
        marginTop: 16,
    },
    actionsContentContainer: {
        paddingBottom: 32,
    },
    trashIcon: {
        width: 20,
        height: 20,
    },
    friendsPanel: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        padding: 16,
    },
    panelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    panelTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        fontSize: 24,
        fontWeight: 'bold',
        width: 30,
        height: 30,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    friendAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    friendName: {
        flex: 1,
        color: "black",
        fontSize: 16,
        fontFamily: 'Inter-Regular',
    },
    removeButton: {
        padding: 8,
        backgroundColor: "rgba(255, 0, 0, 0.7)",
        borderRadius: 10,
    },
    skullIcon: {
        width: 24,
        height: 24,
    },
    searchContainer: {
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    searchInput: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#000',
        fontFamily: 'Inter-Regular',
    },
    decoracoesPanel: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
    },
    decoracoesContent: {
        flex: 1,
    },
    sectionContainer: {
        padding: 20,
        backgroundColor: '#fff',
    },
    sectionTitle: {
        fontSize: 24,
        color: '#000',
        fontFamily: 'Inter-Regular',
        textAlign: 'center',
        marginBottom: 20,
    },
    imageContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileImageContainer: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    previewImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
    },
    bannerPreview: {
        width: '90%',
        height: 200,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#000',
        marginBottom: 20,
    },
    uploadButton: {
        backgroundColor: '#4169E1',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 25,
        elevation: 3,
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Inter-Regular',
    },
    divider: {
        height: 1,
        backgroundColor: '#ccc',
        width: '100%',
    },
    unblockButton: {
        padding: 8,
        backgroundColor: "rgba(0, 255, 0, 0.7)",
        borderRadius: 10,
    },
    themeButton: {
        marginHorizontal: 16,
        marginTop: 12,
        padding: 16,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    themeIcon: {
        width: 24,
        height: 24,
    },
    MinhaConta: {
        width: 195,
        height: 30,
        transform: [{ scale: 1 }],
    },
    closeButtonContainer: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editUsernameIcon: {
        padding: 0,
        backgroundColor: 'transparent',
        borderRadius: 10,
        marginLeft: 10,
    },
});

