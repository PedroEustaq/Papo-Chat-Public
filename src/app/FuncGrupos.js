import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  deleteDoc,
  arrayRemove,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { getUserCustomId } from "./FuncFirebase";

// Função para gerar ID único
const gerarIdUnico = async () => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id;
  let idExiste = true;
  
  while (idExiste) {
    id = '';
    for (let i = 0; i < 8; i++) {
      id += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    
    // Verificar se o ID já existe
    const gruposRef = collection(db, "grupos");
    const q = query(gruposRef, where("grupoId", "==", id));
    const querySnapshot = await getDocs(q);
    idExiste = !querySnapshot.empty;
  }
  
  return id;
};

// Criar um novo grupo
export const criarGrupo = async (nome, descricao, isPrivate = false, imagemGrupo = "") => {
  try {
    const currentUserId = await getUserCustomId(auth.currentUser.uid);
    const grupoId = await gerarIdUnico();
    const groupRef = doc(db, "grupos", grupoId);
    
    await setDoc(groupRef, {
      grupoId,
      nome,
      descricao,
      criadoPor: currentUserId,
      criadoEm: new Date().toISOString(),
      membros: {
        [currentUserId]: {
          cargo: "admin",
          entrouEm: new Date().toISOString()
        }
      },
      imagemGrupo,
      configuracoes: {
        isPrivate,
        permiteConvites: true,
        maxMembros: 100
      },
    });
    
    return grupoId;
  } catch (error) {
    console.error("Erro ao criar grupo:", error);
    return null;
  }
};

// Enviar mensagem para o grupo
export const enviarMensagemGrupo = async (grupoId, conteudo, tipo = "texto") => {
  try {
    const currentUserId = await getUserCustomId(auth.currentUser.uid);
    const messageRef = doc(collection(db, "mensagens_grupo"));
    
    await setDoc(messageRef, {
      mensagemId: messageRef.id,
      grupoId,
      remetenteId: currentUserId,
      conteudo,
      timestamp: new Date().toISOString(),
      tipo,
      anexos: []
    });
    
    return true;
  } catch (error) {
    console.error("Erro ao enviar mensagem do grupo:", error);
    return false;
  }
};

// Adicionar membro ao grupo
export const adicionarMembroGrupo = async (grupoId, userId, cargo = "membro") => {
  try {
    const groupRef = doc(db, "grupos", grupoId);
    
    await updateDoc(groupRef, {
      membros: arrayUnion({
        userId,
        cargo,
        entrouEm: new Date().toISOString()
      })
    });
    
    return true;
  } catch (error) {
    console.error("Erro ao adicionar membro ao grupo:", error);
    return false;
  }
};

// Buscar grupos do usuário
export const buscarGruposUsuario = async () => {
  try {
    const userId = await getUserCustomId(auth.currentUser.uid);
    const gruposRef = collection(db, 'grupos');
    const querySnapshot = await getDocs(gruposRef);
    
    const grupos = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Verifica se o usuário está na lista de membros do grupo
      if (data.membros && data.membros[userId]) {
        grupos.push({
          grupoId: doc.id,
          nome: data.nome,
          imagemGrupo: data.imagemGrupo || "",
          membros: data.membros,
          descricao: data.descricao || "",
          criadoPor: data.criadoPor,
          criadoEm: data.criadoEm,
          configuracoes: data.configuracoes
        });
      }
    });
    
    return grupos;
  } catch (error) {
    console.error('Erro ao buscar grupos do usuário:', error);
    return [];
  }
};

// Buscar mensagens do grupo
export const buscarMensagensGrupo = async (grupoId) => {
  try {
    const mensagensRef = collection(db, "mensagens_grupo");
    const q = query(mensagensRef, where("grupoId", "==", grupoId));
    const querySnapshot = await getDocs(q);
    
    const mensagens = [];
    querySnapshot.forEach((doc) => {
      mensagens.push({ id: doc.id, ...doc.data() });
    });
    
    return mensagens.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  } catch (error) {
    console.error("Erro ao buscar mensagens do grupo:", error);
    return [];
  }
};

// Entrar em um grupo usando código
export const entrarNoGrupoPorCodigo = async (codigoGrupo) => {
  try {
    // Buscar o grupo pelo código
    const gruposRef = collection(db, "grupos");
    const q = query(gruposRef, where("grupoId", "==", codigoGrupo));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.error("Grupo não encontrado");
      return { success: false, message: "Grupo não encontrado" };
    }

    const grupoDoc = querySnapshot.docs[0];
    const grupoData = grupoDoc.data();
    const currentUserId = await getUserCustomId(auth.currentUser.uid);

    // Verificar se o usuário já é membro do grupo
    if (grupoData.membros && grupoData.membros[currentUserId]) {
      return { success: false, message: "Você já é membro deste grupo" };
    }

    // Verificar se o grupo está privado
    if (grupoData.configuracoes && grupoData.configuracoes.isPrivate) {
      return { success: false, message: "Este grupo é privado e requer convite" };
    }

    // Adicionar o usuário como membro do grupo
    const grupoRef = doc(db, "grupos", grupoDoc.id);
    await updateDoc(grupoRef, {
      [`membros.${currentUserId}`]: {
        cargo: "membro",
        entrouEm: new Date().toISOString()
      }
    });

    return { success: true, message: "Entrou no grupo com sucesso" };
  } catch (error) {
    console.error("Erro ao entrar no grupo:", error);
    return { success: false, message: "Erro ao entrar no grupo" };
  }
}; 