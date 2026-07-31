import { collection, getDocs, addDoc, setDoc, deleteDoc, doc, serverTimestamp, orderBy, query, limit } from 'firebase/firestore';
import { db } from './firebase';

export interface Author {
  id: string;
  name: string;
  bio?: string;
  avatar?: string;
  twitter?: string;
  github?: string;
  website?: string;
  createdAt?: any;
}

export interface Post {
  id: string | number;
  title: string;
  subject: string;
  topic: string;
  subtopic?: string;
  prerequisites?: string[];
  learningPath?: string;
  snippet: string;
  content: string;
  image: string;
  author: {
    name: string;
    avatar?: string;
    bio?: string;
    twitter?: string;
    github?: string;
    website?: string;
  } | string;
  date: string;
  readTime: string;
  featured?: boolean;
  createdAt?: any;
  status?: 'draft' | 'published';
  tags?: string[];
  publishDate?: string;
  views?: number;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
}

const POSTS_COLLECTION = 'posts';
const AUTHORS_COLLECTION = 'authors';

export const getAuthors = async (): Promise<Author[]> => {
  const q = query(collection(db, AUTHORS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Author[];
};

export const createAuthor = async (author: Omit<Author, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, AUTHORS_COLLECTION), {
    ...author,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateAuthor = async (id: string, author: Partial<Author>) => {
  const docRef = doc(db, AUTHORS_COLLECTION, id);
  await setDoc(docRef, { ...author, updatedAt: serverTimestamp() }, { merge: true });
};

export const deleteAuthor = async (id: string) => {
  const docRef = doc(db, AUTHORS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const getPosts = async (): Promise<Post[]> => {
  const postsQuery = query(collection(db, POSTS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(postsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Post[];
};

export const createPost = async (post: Omit<Post, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, POSTS_COLLECTION), {
    ...post,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const updatePost = async (id: string | number, post: Partial<Post>) => {
  const docRef = doc(db, POSTS_COLLECTION, String(id));
  await setDoc(docRef, { ...post, updatedAt: serverTimestamp() }, { merge: true });
  
  // Ensure createdAt exists if it's migrating a static post
  if (!post.createdAt) {
    await setDoc(docRef, { createdAt: serverTimestamp() }, { merge: true });
  }
};

export const deletePost = async (id: string | number) => {
  const docRef = doc(db, POSTS_COLLECTION, String(id));
  await deleteDoc(docRef);
};
