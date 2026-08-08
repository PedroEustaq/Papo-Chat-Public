import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, TouchableOpacity, Text, TextInput, StyleSheet, Image, Keyboard } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getContacts, getProfileImage, getUserName, getUserCustomId, getLastMessageText, getLastTimestap, getLastSender, getSystemVersion } from "./FuncFirebase"; // Importa a função de atualização
import { buscarGruposUsuario } from "./FuncGrupos";
import { auth, db } from "./firebase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import VersionCheck from "./VersionCheck";
import { collection, getDocs, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { useTheme } from './ThemeContext';
import { StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  withSequence
} from 'react-native-reanimated';

export default function ChatScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [contacts, setContacts] = useState([]); // Lista de contatos
  const [newContactId, setNewContactId] = useState(""); // ID do contato a ser adicionado
  const [userNameList, setUserNameList] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [ultimasMensagensMandadas, setultimasMensagensMandadas] = useState([]);
  const [ultimTimestamps, setultimTimestamps] = useState([]);
  const [lastSent, setLastSent] = useState([]);
  const [customId, setCustomId] = useState("");
  const [currentUserId, setCurrentUserId] = useState(auth.currentUser ? auth.currentUser.uid : null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const CACHE_TTL_MS = 15000;

  // Valores compartilhados para animação
  const searchWidth = useSharedValue(1);
  const logoOpacity = useSharedValue(1);
  const optionsOpacity = useSharedValue(1);
  const searchTranslateY = useSharedValue(0);
  const searchTranslateX = useSharedValue(0);
  const arrastaProLado = useSharedValue(0);
  const logoDiminuir = useSharedValue(0);
  // Estilos animados

  const searchAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {

          translateX: withSpring(isSearchFocused ? -60 : -20)
        },
        {
          scale: withSpring(isSearchFocused ? 1.05 : 1),
        }
      ]
    };
  });

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(logoOpacity.value, { duration: 300 }),

      transform: [
        {
          translateY: withTiming(
            interpolate(
              logoOpacity.value,
              [1, 0],
              [0, -20],
              Extrapolate.CLAMP
            ),
            { duration: 300 }
          )
        }
      ]
    };
  });


  const optionsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(optionsOpacity.value, { duration: 300 }),
      transform: [
        {
          translateY: withTiming(
            interpolate(
              optionsOpacity.value,
              [1, 0],
              [0, -20],
              Extrapolate.CLAMP
            ),
            { duration: 300 }
          )
        }
      ]
    };
  });

  // Função para lidar com o foco do input
  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    searchWidth.value = withSpring(searchWidth.value + 200)
    logoOpacity.value = 0;
    optionsOpacity.value = 0;
    searchTranslateY.value = 0;
    searchTranslateX.value = 0;
    arrastaProLado.value = withSpring(arrastaProLado.value - 50);
  };

  // Função para lidar com o blur do input
  const handleSearchBlur = () => {
    setIsSearchFocused(false);

    logoOpacity.value = 1;
    optionsOpacity.value = 1;
    searchTranslateY.value = 0;
    searchTranslateX.value = 0;
    arrastaProLado.value = withSpring(arrastaProLado.value + 50);
  };

  useEffect(() => {
    const checkUser = async () => {
      try {

        // Se não tiver no AsyncStorage, tenta pegar do Firebase
        if (auth.currentUser) {
          setCurrentUserId(auth.currentUser.uid);
          return;
        }

        // Primeiro tenta pegar do AsyncStorage
        const storedEmail = await AsyncStorage.getItem('userEmail');
        if (storedEmail) {
          setCurrentUserId(storedEmail);
          return;
        }


      } catch (error) {
      }
    };
    checkUser();
  }, []);

  const fetchContacts = useCallback(async (forceRefresh = false) => {
    if (!currentUserId) return;

    let isActive = true;

    try {
      const storedContacts = await AsyncStorage.getItem('contacts');
      const storedUserNames = await AsyncStorage.getItem('userNames');
      const storedImageUrls = await AsyncStorage.getItem('imageUrls');
      const storedUltimasMSGS = await AsyncStorage.getItem('ultimasMSGS');
      const storedTimestamps = await AsyncStorage.getItem('timestamps');
      const storedLastSent = await AsyncStorage.getItem('lastSent');
      const lastUpdatedAt = await AsyncStorage.getItem('contactsLastUpdated');
      const shouldRefresh = forceRefresh || !lastUpdatedAt || (Date.now() - Number(lastUpdatedAt) > CACHE_TTL_MS);

      if (storedContacts && !shouldRefresh && isActive) {
        setContacts(JSON.parse(storedContacts));
        setUserNameList(JSON.parse(storedUserNames || '[]'));
        setImageUrls(JSON.parse(storedImageUrls || '[]'));
        setultimasMensagensMandadas(JSON.parse(storedUltimasMSGS || '[]'));
        setultimTimestamps(JSON.parse(storedTimestamps || '[]'));
        setLastSent(JSON.parse(storedLastSent || '[]'));
        return;
      }

      const id = await getUserCustomId(currentUserId);
      if (!id || !isActive) return;

      setCustomId(id);

      const fetchedContacts = await getContacts();
      const contactsList = fetchedContacts || [];

      if (!isActive) return;

      setContacts(contactsList);

      const nomes = [];
      const images = [];
      const ultimasMSGS = [];
      const timestamps = [];
      const lastSentT = [];

      for (const contact of contactsList) {
        const [userName, profileImg, lastMessage, lastTimestamp, lastSender] = await Promise.all([
          getUserName(contact),
          getProfileImage(contact),
          getLastMessageText(id, contact),
          getLastTimestap(id, contact),
          getLastSender(id, contact),
        ]);

        nomes.push(userName);
        images.push(profileImg);
        ultimasMSGS.push(lastMessage || "");
        timestamps.push(lastTimestamp || "");
        lastSentT.push(lastSender || "");
      }

      if (!isActive) return;

      await AsyncStorage.setItem('contacts', JSON.stringify(contactsList));
      await AsyncStorage.setItem('userNames', JSON.stringify(nomes));
      await AsyncStorage.setItem('imageUrls', JSON.stringify(images));
      await AsyncStorage.setItem('ultimasMSGS', JSON.stringify(ultimasMSGS));
      await AsyncStorage.setItem('timestamps', JSON.stringify(timestamps));
      await AsyncStorage.setItem('lastSent', JSON.stringify(lastSentT));
      await AsyncStorage.setItem('contactsLastUpdated', String(Date.now()));

      setUserNameList(nomes);
      setImageUrls(images);
      setultimasMensagensMandadas(ultimasMSGS);
      setultimTimestamps(timestamps);
      setLastSent(lastSentT);
    } catch (error) {
      console.warn('Erro ao carregar contatos:', error);
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      fetchContacts(true);
    }, [fetchContacts])
  );

  useEffect(() => {
    if (!currentUserId) return;

    const unsubscribe = onSnapshot(collection(db, "messages"), () => {
      fetchContacts(true);
    });

    return () => unsubscribe();
  }, [currentUserId, fetchContacts]);

  useEffect(() => {
    fetchContacts(false);
  }, [fetchContacts]);

  useEffect(() => {
    let isMounted = true;

    const carregarGrupos = async () => {
      try {
        const gruposUsuario = await buscarGruposUsuario();
        if (isMounted) {
          setGrupos(gruposUsuario);
        }
      } catch (error) {
        console.error('Erro ao carregar grupos:', error);
      }
    };

    carregarGrupos();

    return () => {
      isMounted = false;
    };
  }, []);

  //Icone se receber mensagem
  const imageMap = {
    "Vector.png": require('./icons/Vector.png'),
  };

  const addBlockedContactsField = async () => {
    try {
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);

      const updatePromises = usersSnapshot.docs.map(async (userDoc) => {
        const userRef = doc(db, "users", userDoc.id);
        await updateDoc(userRef, {
          blockedContacts: []
        });
      });

      await Promise.all(updatePromises);
      alert("Campo blockedContacts adicionado com sucesso!");
    } catch (error) {
      alert("Erro ao adicionar campo blockedContacts");
    }
  };

  const handleSearch = (text) => {
    setNewContactId(text);
  };

  useEffect(() => {
    const text = newContactId.trim();

    if (!text) {
      setFilteredData([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      const searchText = text.toLowerCase();

      const filteredContacts = contacts.filter((contact, index) => {
        const userName = userNameList[index]?.toLowerCase() || '';
        const lastMessage = ultimasMensagensMandadas[index]?.toLowerCase() || '';
        return userName.includes(searchText) || lastMessage.includes(searchText);
      });

      const filteredGroups = grupos.filter(group => {
        const groupName = group.nome?.toLowerCase() || '';
        return groupName.includes(searchText);
      });

      setFilteredData([...filteredContacts, ...filteredGroups]);
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [newContactId, contacts, userNameList, ultimasMensagensMandadas, grupos]);

  // Modifica o renderItem para usar os dados filtrados quando houver pesquisa
  const renderItem = ({ item, index }) => {
    // Se for um grupo
    if (item.grupoId) {
      return (
        <TouchableOpacity
          style={[styles.contactItem, {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderColor
          }]}
          onPress={() => navigation.navigate('ChatGrupo', {
            grupoId: item.grupoId,
            grupoNome: item.nome,
            grupoImagem: item.imagemGrupo
          })}
        >
          <Image
            style={{ width: 55, height: 55, borderRadius: 30 }}
            source={
              item.imagemGrupo
                ? { uri: item.imagemGrupo }
                : require("./decoracoes/TravelerIcon.png")
            }
          />
          <View style={styles.containerPadrao}>
            <View style={{ justifyContent: 'space-around', height: '100%', width: "90%" }}>
              <Text style={[styles.contactName, { color: theme.text }]}>{item.nome}</Text>
              <Text style={[styles.utlimaMSG, { color: theme.text }]}>Grupo • {item.membros.length} membros</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Se for um contato
    const contactIndex = contacts.indexOf(item);
    return (
      <TouchableOpacity
        style={[styles.contactItem, {
          backgroundColor: theme.cardBackground,
          borderColor: theme.borderColor
        }]}
        onPress={() => navigation.navigate('PrivateChat', {
          userId: customId,
          contactId: item,
          profileId: imageUrls[contactIndex] || null
        })}
      >
        <Image
          style={{ width: 55, height: 55, borderRadius: 30 }}
          source={
            imageUrls[contactIndex]
              ? { uri: imageUrls[contactIndex] }
              : require("./decoracoes/TravelerIcon.png")
          }
        />
        <View style={styles.containerPadrao}>
          <View style={{ justifyContent: 'space-around', height: '100%', width: "90%" }}>
            <Text style={[styles.contactName, { color: theme.text }]}>{userNameList[contactIndex]}</Text>
            <Text style={[styles.utlimaMSG, { color: theme.text }]}>{ultimasMensagensMandadas[contactIndex]}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', justifyContent: 'space-around', height: '100%' }}>
            <Text style={[styles.ultimaTIMEST, { color: theme.text }]}>{ultimTimestamps[contactIndex]?.slice(0, -3)}</Text>
            <Image source={imageMap[lastSent[contactIndex]]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.pagina, { backgroundColor: theme.background }]}>
      <VersionCheck />
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#1c1c1c' : '#fff'}
      />
      <View style={styles.cabeca}>
        <Animated.View style={[styles.containerLogo, logoAnimatedStyle]}>
          <Image source={require("./icons/BalaoVerdin.png")} style={[, { width: 36, height: 38 }]} />
          <Image source={require("./decoracoes/Papo.png")} style={[styles.PapoImg, isDarkMode ? { tintColor: '#FFFFFF' } : { tintColor: '#000000' }]} />
        </Animated.View>
        <View style={[styles.addContactContainer, isSearchFocused && styles.addContactContainerFocused]}>
          <Animated.View style={[styles.inputContainer, searchAnimatedStyle]}>
            <Ionicons name="search" size={20} color={theme.text} style={styles.searchIcon} />
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderColor: theme.borderColor
              }]}
              placeholder='Pesquisar'
              value={newContactId}
              onChangeText={handleSearch}
              placeholderTextColor={theme.text}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
            />
            {isSearchFocused && (
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  handleSearchBlur();
                  setNewContactId("");
                  setFilteredData([]);
                }}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={theme.text} />
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
        <Animated.View style={[styles.containerOpcoes, optionsAnimatedStyle]}>
          <TouchableOpacity onPress={() => navigation.navigate('PedidosAmizade', { currentUserId: customId })}>
            <Image
              source={isDarkMode ? require("./icons/bellDark.png") : require("./icons/bellLight.png")}
              style={[
                { width: 22.23, height: 24.17, marginRight: 20 },
              ]}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Config', { currentUserId: customId })}>
            <Image
              source={isDarkMode ? require("./icons/ConfigDark.png") : require("./icons/ConfigLight.png")}
              style={[styles.configicon, { marginRight: 20 }]}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
      <View style={[styles.AtividadesSecti, { backgroundColor: isDarkMode ? "#333" : "white" }]}>
        <Text style={{
          color: isDarkMode ? "white" : "black", fontWeight: 400, paddingLeft: 20, paddingTop: 10, letterSpacing: -1.5,
          fontSize: 25,
        }}>Atividades</Text>
        <View style={styles.atividadesContainer}>
          {/* 
          <View style={styles.GarrafaPerdida}>
            <TouchableOpacity style={styles.garrafaButton}>
              <Image 
                source={isDarkMode ? require("./icons/GarrafaDark.png") : require("./icons/GarrafaLight.png")}
                style={styles.garrafaIcon}
              />
              <Text style={[styles.garrafaText, {color: isDarkMode ? "white" : "black"}]}>Garrafa Perdida</Text>
            </TouchableOpacity>
          </View>
          */}
          <View style={styles.CriarGrupo}>
            <TouchableOpacity
              style={styles.grupoButton}
              onPress={() => navigation.navigate('CriarGrupo')}
            >
              <Image
                source={isDarkMode ? require("./icons/groupDark.png") : require("./icons/groupLight.png")}
                style={styles.grupoIcon}
              />
              <Text style={[styles.grupoText, { color: isDarkMode ? "white" : "black" }]}>Grupos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* Botão temporário para adicionar blockedContacts 
      <TouchableOpacity 
        style={styles.tempButton} 
        onPress={addBlockedContactsField}
      >
        <Text style={styles.tempButtonText}>Adicionar Campo BlockedContacts</Text>
      </TouchableOpacity>
*/}

      {/* Campo para pesquisar contato */}

      {/* Lista de contatos */}

      <FlatList
        data={newContactId.trim() ? filteredData : [...contacts, ...grupos]}
        contentContainerStyle={styles.flatlist}
        keyExtractor={(item) => item.grupoId || item}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  AtividadesSecti: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    width: "98%",
    alignSelf: 'center',
    marginBottom: 5,
    marginTop: 5,
  },
  flatlist: {
    width: "100%",
    height: "95%",
    alignItems: 'center',
    overflowY: 'scroll',
    paddingBottom: 500,
  },
  ultimaTIMEST: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    transform: [{ translateX: -10, }]
  },
  utlimaMSG: {
    fontFamily: 'Inter-Regular',
    fontWeight: 100,
    fontSize: 13,
  },
  containerPadrao: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    height: '100%',
    width: '90%',
    justifyContent: 'space-between',
    paddingLeft: 10,
    paddingRight: 15,
    height: 60,
  },
  containerOpcoes: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    height: '100%',
  },
  containerOpcoesHidden: {
    display: 'none',
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    fontFamily: "Poppins_400Regular",
  },
  pagina: {
    flex: 1,
    padding: 5,
  },
  botao: {
    fontFamily: "Poppins_400Regular",
    backgroundColor: "red",
    color: "black",
  },
  cabeca: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
  },
  containerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
  },
  containerLogoHidden: {
    display: 'none',
  },
  addContactContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 0,
    backgroundColor: 'transparent',
    height: "100%",
    flex: 1,
  },
  addContactContainerFocused: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
    transformOrigin: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  input: {
    height: 40,
    paddingLeft: 30,
    paddingRight: 10,
    borderWidth: 1,
    borderRadius: 20,
    fontSize: 12,
    marginLeft: 10,
    marginRight: 10,
    fontWeight: 100,
    width: 120,
    fontFamily: 'Inter-Regular',
  },
  contactItem: {
    paddingTop: 10,
    paddingLeft: 10,
    paddingBottom: 10,
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    justifyContent: "start",
    borderRadius: 5,
    marginBottom: 5,
    borderBottomWidth: 0,
    width: "95%",
    alignSelf: 'center',
  },
  configicon: {
    width: 27,
    height: 27,
  },
  imageOne: {
    width: 50,
    height: 50,
    borderRadius: 40,
  },
  contactName: {
    fontSize: 18,
    marginLeft: 0,
    fontWeight: 600,
    fontFamily: 'Inter-Regular',
  },
  tempButton: {
    backgroundColor: '#5FFF72',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.61)',
  },
  tempButtonText: {
    color: '#000',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  PapoImg: {
    transform: [{ scale: 0.8 }, { translateX: 0 }],
    height: 35,
    width: 75,
  },
  backButton: {
    position: 'absolute',
    right: 10,
    padding: 5,
  },
  atividadesContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  GarrafaPerdida: {
    alignItems: 'center',
  },
  CriarGrupo: {
    alignItems: 'center',
    marginLeft: 20,
  },
  garrafaButton: {
    width: 80,
    height: 80,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#000'
  },
  grupoButton: {
    width: 80,
    height: 80,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#000'
  },
  garrafaIcon: {
    width: 35,
    height: 35,
    marginBottom: 0,
    borderRadius: 10,
    transform: [{ scale: 1 }],
    padding: 5
  },
  grupoIcon: {
    width: 35,
    height: 35,
    marginBottom: 0,
    borderRadius: 10,
    transform: [{ scale: 1 }],
    padding: 5
  },
  garrafaText: {
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  grupoText: {
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
});


