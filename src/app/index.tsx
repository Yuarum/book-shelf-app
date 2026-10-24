import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  FlatList,
  Modal,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORAGE_KEY = '@book_shelf_data_v1';
const TYPES_KEY = '@book_shelf_types_v1';
const THEME_KEY = '@book_shelf_theme_v1';
const GOALS_KEY = '@book_shelf_goals_v1';

export const BOOK_COLORS = ['#2D5F4A', '#1E3A5F', '#A84B43', '#8C3B30', '#D9C589', '#5B3E6A', '#2C3E50'];

export interface Item {
  id: string;
  title: string;
  type: string;
  orderNo: string;
  status?: string;
  progress?: string;
  note?: string;
  coverColor?: string;
}

export interface Shelf {
  id: string;
  name: string;
  items: Item[];
}

export interface Library {
  id: string;
  name: string;
  shelves: Shelf[];
}

export interface SearchItem extends Item {
  libraryName: string;
  shelfName: string;
}

export interface PlannerGoals {
  dailyPageTarget: string;
  dailyPageCurrent: string;
  weeklyTarget: string;
  weeklyCurrent: string;
  monthlyTarget: string;
  monthlyCurrent: string;
}

export default function Index() {
  const [isBookOpen, setIsBookOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'library' | 'search' | 'stats' | 'settings'>('library');

  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const dragProgress = useSharedValue<number>(0);

  const [itemTypes, setItemTypes] = useState<string[]>(['Kitap', 'Oyun', 'Dergi', 'Manga']);
  const [newTypeName, setNewTypeName] = useState<string>('');

  const [libraries, setLibraries] = useState<Library[]>([]);

  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);

  const [modalType, setModalType] = useState<'library' | 'shelf' | 'item' | null>(null);
  const [newItemTitle, setNewItemTitle] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('Kitap');
  const [newOrderNo, setNewOrderNo] = useState<string>('');
  const [selectedCoverColor, setSelectedCoverColor] = useState<string>(BOOK_COLORS[0]);

  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const [editStatus, setEditStatus] = useState<string>('Başlanmadı');
  const [editProgress, setEditProgress] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [editCoverColor, setEditCoverColor] = useState<string>(BOOK_COLORS[0]);

  const [searchQuery, setSearchQuery] = useState<string>('');

  const [goals, setGoals] = useState<PlannerGoals>({
    dailyPageTarget: '30',
    dailyPageCurrent: '0',
    weeklyTarget: '1',
    weeklyCurrent: '0',
    monthlyTarget: '3',
    monthlyCurrent: '0',
  });

  const [jsonInput, setJsonInput] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // --- 1. 3D KAPAK JESTLERİ ---
  const handleOpenBook = () => setIsBookOpen(true);
  const handleCloseBook = () => {
    setIsBookOpen(false);
    setSelectedLibrary(null);
    setSelectedShelf(null);
  };

  const onGestureEventOpen = (event: PanGestureHandlerGestureEvent) => {
    const translationX = event.nativeEvent.translationX;
    if (translationX < 0) {
      dragProgress.value = Math.min(Math.abs(translationX) / (SCREEN_WIDTH * 0.6), 1);
    }
  };

  const onGestureEndOpen = (event: PanGestureHandlerGestureEvent) => {
    const translationX = event.nativeEvent.translationX;
    if (translationX < -60) {
      dragProgress.value = withSpring(1, { damping: 15 }, (finished) => {
        if (finished) runOnJS(handleOpenBook)();
      });
    } else {
      dragProgress.value = withSpring(0);
    }
  };

  const onGestureEventClose = (event: PanGestureHandlerGestureEvent) => {
    const translationX = event.nativeEvent.translationX;
    if (translationX > 0) {
      dragProgress.value = Math.max(1 - translationX / (SCREEN_WIDTH * 0.6), 0);
    }
  };

  const onGestureEndClose = (event: PanGestureHandlerGestureEvent) => {
    const translationX = event.nativeEvent.translationX;
    if (translationX > SCREEN_WIDTH * 0.3) {
      dragProgress.value = withSpring(0, { damping: 18, stiffness: 90 }, (finished) => {
        if (finished) runOnJS(handleCloseBook)();
      });
    } else {
      dragProgress.value = withSpring(1, { damping: 18, stiffness: 90 });
    }
  };

  const cover3DAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = dragProgress.value * -110;
    return {
      transform: [
        { perspective: 1200 },
        { translateX: -SCREEN_WIDTH / 2 },
        { rotateY: `${rotateY}deg` },
        { translateX: SCREEN_WIDTH / 2 },
      ],
      opacity: isBookOpen && dragProgress.value === 1 ? 0 : 1 - dragProgress.value * 0.2,
    };
  });

  // --- 2. ASYNCSTORAGE ---
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    saveData();
  }, [libraries, itemTypes, isDarkMode, goals]);

  const loadData = async () => {
    try {
      const savedLibs = await AsyncStorage.getItem(STORAGE_KEY);
      const savedTypes = await AsyncStorage.getItem(TYPES_KEY);
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      const savedGoals = await AsyncStorage.getItem(GOALS_KEY);

      if (savedLibs) setLibraries(JSON.parse(savedLibs) as Library[]);
      else {
        setLibraries([
          {
            id: 'lib-1',
            name: 'Salon Kitaplığı',
            shelves: [
              {
                id: 'shelf-1',
                name: 'The favorites',
                items: [
                  { id: 'i-1', title: 'The Secret Garden', type: 'Kitap', orderNo: '1', status: 'Okunuyor/Oynanıyor', progress: 'Sayfa 120', note: 'Harika gidiyor', coverColor: BOOK_COLORS[0] },
                  { id: 'i-2', title: 'The Great Gatsby', type: 'Kitap', orderNo: '2', status: 'Tamamlandı', progress: '', note: '', coverColor: BOOK_COLORS[1] },
                  { id: 'i-3', title: 'Pride & Prejudice', type: 'Kitap', orderNo: '3', status: 'Başlanmadı', progress: '', note: '', coverColor: BOOK_COLORS[2] },
                ],
              },
            ],
          },
        ]);
      }

      if (savedTypes) setItemTypes(JSON.parse(savedTypes) as string[]);
      if (savedTheme) setIsDarkMode(JSON.parse(savedTheme) as boolean);
      if (savedGoals) setGoals(JSON.parse(savedGoals) as PlannerGoals);
    } catch (e) {
      console.error('Veri yükleme hatası:', e);
    }
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(libraries));
      await AsyncStorage.setItem(TYPES_KEY, JSON.stringify(itemTypes));
      await AsyncStorage.setItem(THEME_KEY, JSON.stringify(isDarkMode));
      await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    } catch (e) {
      console.error('Veri kaydetme hatası:', e);
    }
  };

  // --- 3. DİNAMİK TEMA DOKUSU ---
  const currentTheme = {
    bg: isDarkMode ? '#121A21' : '#F5EFEB',
    cardBg: isDarkMode ? '#1E2833' : '#FFFCF7',
    textColor: isDarkMode ? '#E1D9CE' : '#2C221E',
    subTextColor: isDarkMode ? '#92A1B0' : '#8C7E72',
    accentColor: '#B89252',
    border: isDarkMode ? '#2D3A48' : '#E8DFD5',
    inputBg: isDarkMode ? '#16212B' : '#EFE8E1',
    coverBg: isDarkMode ? '#0B1015' : '#1E2D3B',
  };

  // --- 4. HESAPLAMALAR ---
  const getAllItems = (): SearchItem[] => {
    const result: SearchItem[] = [];
    libraries.forEach((lib) => {
      lib.shelves.forEach((sh) => {
        sh.items.forEach((it) => {
          result.push({
            ...it,
            libraryName: lib.name,
            shelfName: sh.name,
          });
        });
      });
    });
    return result;
  };

  const allItems = getAllItems();
  const totalLibraries = libraries.length;
  const totalShelves = libraries.reduce((acc, lib) => acc + lib.shelves.length, 0);
  const totalItemsCount = allItems.length;

  const completedItemsCount = allItems.filter(
      (i) => i.status === 'Tamamlandı' || i.status === 'Bitti'
  ).length;

  const completionPercentage =
      totalItemsCount > 0 ? Math.round((completedItemsCount / totalItemsCount) * 100) : 0;

  const typeCounts = itemTypes.map((type) => ({
    type,
    count: allItems.filter((i) => i.type === type).length,
  }));

  // --- 5. CRUD İŞLEMLERİ ---
  const moveItemOrder = (itemId: string, direction: 'up' | 'down') => {
    if (!selectedLibrary || !selectedShelf) return;

    const currentItems = [...selectedShelf.items];
    const index = currentItems.findIndex((it) => it.id === itemId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentItems.length) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const temp = currentItems[index];
    currentItems[index] = currentItems[targetIndex];
    currentItems[targetIndex] = temp;

    const updatedItems = currentItems.map((it, idx) => ({ ...it, orderNo: (idx + 1).toString() }));
    updateShelfItems(updatedItems);
  };

  const updateShelfItems = (newItems: Item[]) => {
    if (!selectedLibrary || !selectedShelf) return;

    const updatedLibs = libraries.map((lib) => {
      if (lib.id === selectedLibrary.id) {
        const updatedShelves = lib.shelves.map((sh) =>
            sh.id === selectedShelf.id ? { ...sh, items: newItems } : sh
        );
        return { ...lib, shelves: updatedShelves };
      }
      return lib;
    });

    setLibraries(updatedLibs);
    setSelectedShelf({ ...selectedShelf, items: newItems });
  };

  const deleteLibrary = (libId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLibraries(libraries.filter((l) => l.id !== libId));
  };

  const deleteShelf = (shelfId: string) => {
    if (!selectedLibrary) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updatedShelves = selectedLibrary.shelves.filter((s) => s.id !== shelfId);
    const updatedLibs = libraries.map((lib) =>
        lib.id === selectedLibrary.id ? { ...lib, shelves: updatedShelves } : lib
    );
    setLibraries(updatedLibs);
    setSelectedLibrary({ ...selectedLibrary, shelves: updatedShelves });
  };

  const deleteItem = (itemId: string) => {
    if (!selectedShelf) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    updateShelfItems(selectedShelf.items.filter((i) => i.id !== itemId));
  };

  const handleAddItem = () => {
    if (!newItemTitle.trim()) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (modalType === 'library') {
      const newLib: Library = { id: Date.now().toString(), name: newItemTitle, shelves: [] };
      setLibraries([...libraries, newLib]);
    } else if (modalType === 'shelf' && selectedLibrary) {
      const newShelf: Shelf = { id: Date.now().toString(), name: newItemTitle, items: [] };
      const updated = libraries.map((lib) =>
          lib.id === selectedLibrary.id ? { ...lib, shelves: [...lib.shelves, newShelf] } : lib
      );
      setLibraries(updated);
      setSelectedLibrary({ ...selectedLibrary, shelves: [...selectedLibrary.shelves, newShelf] });
    } else if (modalType === 'item' && selectedLibrary && selectedShelf) {
      const calculatedOrder = newOrderNo.trim() || (selectedShelf.items.length + 1).toString();
      const newItem: Item = {
        id: Date.now().toString(),
        title: newItemTitle,
        type: selectedType,
        orderNo: calculatedOrder,
        status: 'Başlanmadı',
        progress: '',
        note: '',
        coverColor: selectedCoverColor,
      };

      updateShelfItems([...selectedShelf.items, newItem]);
    }

    setNewItemTitle('');
    setNewOrderNo('');
    setModalType(null);
  };

  const openDetailModal = (item: Item) => {
    setDetailItem(item);
    setEditStatus(item.status || 'Başlanmadı');
    setEditProgress(item.progress || '');
    setEditNote(item.note || '');
    setEditCoverColor(item.coverColor || BOOK_COLORS[0]);
  };

  const saveItemDetails = () => {
    if (!detailItem || !selectedShelf) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updatedItems = selectedShelf.items.map((it) =>
        it.id === detailItem.id
            ? { ...it, status: editStatus, progress: editProgress, note: editNote, coverColor: editCoverColor }
            : it
    );

    updateShelfItems(updatedItems);
    setDetailItem(null);
  };

  const handleAddType = () => {
    if (!newTypeName.trim()) return;
    if (!itemTypes.includes(newTypeName.trim())) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setItemTypes([...itemTypes, newTypeName.trim()]);
      setSelectedType(newTypeName.trim());
    }
    setNewTypeName('');
  };

  const handleImportJSON = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed)) {
        setLibraries(parsed);
        setIsImportModalOpen(false);
        setJsonInput('');
        Alert.alert('Başarılı', 'Yedek veriler yüklendi!');
      } else {
        Alert.alert('Hata', 'Geçersiz veri formatı!');
      }
    } catch {
      Alert.alert('Hata', 'JSON ayrıştırılamadı!');
    }
  };

  const filteredSearchItems = allItems.filter(
      (i) =>
          i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTop3Items = (items: Item[]) => items.slice(0, 3);

  return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.bg }]}>
          <PanGestureHandler onGestureEvent={onGestureEventClose} onHandlerStateChange={onGestureEndClose}>
            <View style={styles.mainContent}>
              <View style={styles.pageBody}>
                {/* TAB 1: KİTAPLIKLAR */}
                {activeTab === 'library' && (
                    <View style={styles.tabContent}>
                      {!selectedLibrary && (
                          <>
                            <Text style={styles.subHeaderTag}>YOUR PERSONAL COLLECTION</Text>
                            <View style={styles.headerRow}>
                              <Text style={[styles.faintTitle, { color: currentTheme.textColor }]}>
                                My Book Shelf
                              </Text>
                              <TouchableOpacity
                                  style={[styles.addCircleButton, { backgroundColor: currentTheme.coverBg }]}
                                  onPress={() => setModalType('library')}
                              >
                                <Text style={styles.addCircleButtonText}>+</Text>
                              </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.searchBarFake, { backgroundColor: currentTheme.inputBg, borderColor: currentTheme.border }]}
                                onPress={() => setActiveTab('search')}
                            >
                              <Text style={styles.searchBarPlaceholder}>🔍 Find a book, author, or shelf</Text>
                            </TouchableOpacity>

                            <View style={styles.sectionHeaderRow}>
                              <Text style={[styles.sectionTitle, { color: currentTheme.textColor }]}>Your shelves</Text>
                              <Text style={[styles.sectionMetaText, { color: currentTheme.subTextColor }]}>
                                {totalItemsCount} books · {totalShelves} shelves
                              </Text>
                            </View>

                            <FlatList
                                data={libraries}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => {
                                  const libItems = item.shelves.flatMap((s) => s.items);
                                  const top3 = getTop3Items(libItems);

                                  return (
                                      <View style={styles.cardRow}>
                                        <TouchableOpacity
                                            style={[styles.cardMain, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}
                                            onPress={() => setSelectedLibrary(item)}
                                        >
                                          <View style={styles.woodShelfPreview}>
                                            {top3.length > 0 ? (
                                                top3.map((it, idx) => (
                                                    <View
                                                        key={it.id}
                                                        style={[
                                                          styles.bookCoverMock,
                                                          { backgroundColor: it.coverColor || BOOK_COLORS[idx % BOOK_COLORS.length] },
                                                        ]}
                                                    >
                                                      <Text style={styles.bookCoverText} numberOfLines={3}>
                                                        {it.title.toUpperCase()}
                                                      </Text>
                                                    </View>
                                                ))
                                            ) : (
                                                <Text style={styles.emptyShelfLabel}>Boş Raf</Text>
                                            )}
                                          </View>
                                          <View style={[styles.cardBottomInfo, { backgroundColor: currentTheme.cardBg }]}>
                                            <Text style={[styles.cardTitle, { color: currentTheme.textColor }]}>{item.name}</Text>
                                            <Text style={[styles.cardSubtitle, { color: currentTheme.subTextColor }]}>
                                              Shelf A - Row {item.shelves.length} · {libItems.length} books
                                            </Text>
                                          </View>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteBtn}
                                            onPress={() => deleteLibrary(item.id)}
                                        >
                                          <Text style={styles.deleteBtnText}>🗑️</Text>
                                        </TouchableOpacity>
                                      </View>
                                  );
                                }}
                                ListEmptyComponent={
                                  <Text style={[styles.emptyText, { color: currentTheme.subTextColor }]}>Henüz hiç kitaplık eklenmedi.</Text>
                                }
                                ListFooterComponent={
                                  <TouchableOpacity
                                      style={styles.makeRoomButton}
                                      onPress={() => setModalType('library')}
                                  >
                                    <Text style={styles.makeRoomButtonText}>+ Make room for another shelf</Text>
                                  </TouchableOpacity>
                                }
                            />
                          </>
                      )}

                      {selectedLibrary && !selectedShelf && (
                          <>
                            <TouchableOpacity
                                style={[styles.backButtonContainer, { backgroundColor: currentTheme.inputBg }]}
                                onPress={() => setSelectedLibrary(null)}
                            >
                              <Text style={[styles.backButtonText, { color: currentTheme.textColor }]}>⬅ Kitaplıklara Dön</Text>
                            </TouchableOpacity>

                            <View style={styles.headerRow}>
                              <Text style={[styles.faintTitle, { color: currentTheme.textColor }]}>{selectedLibrary.name}</Text>
                              <TouchableOpacity
                                  style={[styles.addCircleButton, { backgroundColor: currentTheme.coverBg }]}
                                  onPress={() => setModalType('shelf')}
                              >
                                <Text style={styles.addCircleButtonText}>+</Text>
                              </TouchableOpacity>
                            </View>

                            <FlatList
                                data={selectedLibrary.shelves}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => {
                                  const top3 = getTop3Items(item.items);

                                  return (
                                      <View style={styles.cardRow}>
                                        <TouchableOpacity
                                            style={[styles.cardMain, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}
                                            onPress={() => setSelectedShelf(item)}
                                        >
                                          <View style={styles.woodShelfPreview}>
                                            {top3.length > 0 ? (
                                                top3.map((it, idx) => (
                                                    <View
                                                        key={it.id}
                                                        style={[
                                                          styles.bookCoverMock,
                                                          { backgroundColor: it.coverColor || BOOK_COLORS[(idx + 1) % BOOK_COLORS.length] },
                                                        ]}
                                                    >
                                                      <Text style={styles.bookCoverText} numberOfLines={3}>
                                                        {it.title.toUpperCase()}
                                                      </Text>
                                                    </View>
                                                ))
                                            ) : (
                                                <Text style={styles.emptyShelfLabel}>Boş Raf</Text>
                                            )}
                                          </View>
                                          <View style={[styles.cardBottomInfo, { backgroundColor: currentTheme.cardBg }]}>
                                            <Text style={[styles.cardTitle, { color: currentTheme.textColor }]}>{item.name}</Text>
                                            <Text style={[styles.cardSubtitle, { color: currentTheme.subTextColor }]}>{item.items.length} books</Text>
                                          </View>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteBtn}
                                            onPress={() => deleteShelf(item.id)}
                                        >
                                          <Text style={styles.deleteBtnText}>🗑️</Text>
                                        </TouchableOpacity>
                                      </View>
                                  );
                                }}
                                ListEmptyComponent={
                                  <Text style={[styles.emptyText, { color: currentTheme.subTextColor }]}>Bu kitaplıkta raf yok.</Text>
                                }
                            />
                          </>
                      )}

                      {selectedLibrary && selectedShelf && (
                          <>
                            <TouchableOpacity
                                style={[styles.backButtonContainer, { backgroundColor: currentTheme.inputBg }]}
                                onPress={() => setSelectedShelf(null)}
                            >
                              <Text style={[styles.backButtonText, { color: currentTheme.textColor }]}>⬅ Raflara Dön</Text>
                            </TouchableOpacity>

                            <View style={styles.headerRow}>
                              <Text style={[styles.faintTitle, { color: currentTheme.textColor }]}>{selectedShelf.name}</Text>
                              <TouchableOpacity
                                  style={[styles.addCircleButton, { backgroundColor: currentTheme.coverBg }]}
                                  onPress={() => setModalType('item')}
                              >
                                <Text style={styles.addCircleButtonText}>+</Text>
                              </TouchableOpacity>
                            </View>

                            <FlatList
                                data={selectedShelf.items}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item, index }) => (
                                    <View style={styles.itemCardRow}>
                                      <View style={[styles.orderActions, { backgroundColor: currentTheme.cardBg }]}>
                                        <TouchableOpacity
                                            disabled={index === 0}
                                            onPress={() => moveItemOrder(item.id, 'up')}
                                        >
                                          <Text style={[styles.arrowText, { color: currentTheme.textColor }, index === 0 && styles.disabledText]}>
                                            ▲
                                          </Text>
                                        </TouchableOpacity>
                                        <Text style={[styles.orderBadge, { color: currentTheme.textColor }]}>{item.orderNo}</Text>
                                        <TouchableOpacity
                                            disabled={index === selectedShelf.items.length - 1}
                                            onPress={() => moveItemOrder(item.id, 'down')}
                                        >
                                          <Text
                                              style={[
                                                styles.arrowText,
                                                { color: currentTheme.textColor },
                                                index === selectedShelf.items.length - 1 && styles.disabledText,
                                              ]}
                                          >
                                            ▼
                                          </Text>
                                        </TouchableOpacity>
                                      </View>

                                      <TouchableOpacity
                                          style={[styles.itemCardMain, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border, borderLeftWidth: 6, borderLeftColor: item.coverColor || BOOK_COLORS[0] }]}
                                          onPress={() => openDetailModal(item)}
                                      >
                                        <View style={styles.cardHeader}>
                                          <Text style={[styles.itemTitleText, { color: currentTheme.textColor }]}>{item.title}</Text>
                                          <View style={styles.typeTag}>
                                            <Text style={styles.typeTagText}>{item.type}</Text>
                                          </View>
                                        </View>

                                        <View style={styles.itemMetaRow}>
                                          <Text style={styles.statusBadge}>{item.status || 'Başlanmadı'}</Text>
                                          {item.progress ? (
                                              <Text style={[styles.progressText, { color: currentTheme.subTextColor }]}>📍 {item.progress}</Text>
                                          ) : null}
                                        </View>

                                        {item.note ? (
                                            <Text style={styles.noteSnippet} numberOfLines={1}>
                                              💬 {item.note}
                                            </Text>
                                        ) : null}
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                          style={styles.deleteBtn}
                                          onPress={() => deleteItem(item.id)}
                                      >
                                        <Text style={styles.deleteBtnText}>🗑️</Text>
                                      </TouchableOpacity>
                                    </View>
                                )}
                                ListEmptyComponent={
                                  <Text style={[styles.emptyText, { color: currentTheme.subTextColor }]}>Bu rafta henüz öge yok.</Text>
                                }
                            />
                          </>
                      )}
                    </View>
                )}

                {/* TAB 2: ARAMA */}
                {activeTab === 'search' && (
                    <View style={styles.tabContent}>
                      <Text style={[styles.faintTitle, { color: currentTheme.textColor }]}>Arama</Text>
                      <TextInput
                          style={[styles.searchInput, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border, color: currentTheme.textColor }]}
                          placeholder="Find a book, author, or shelf..."
                          placeholderTextColor="#A89A8B"
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                      />

                      <FlatList
                          data={filteredSearchItems}
                          keyExtractor={(item) => item.id}
                          renderItem={({ item }) => (
                              <TouchableOpacity
                                  style={[styles.cardMain, { marginBottom: 10, backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}
                                  onPress={() => openDetailModal(item)}
                              >
                                <View style={styles.cardHeader}>
                                  <Text style={[styles.itemTitleText, { color: currentTheme.textColor }]}>{item.title}</Text>
                                  <View style={styles.typeTag}>
                                    <Text style={styles.typeTagText}>{item.type}</Text>
                                  </View>
                                </View>
                                <Text style={[styles.cardSubtitle, { color: currentTheme.subTextColor }]}>
                                  📍 <Text style={{ fontWeight: 'bold', color: currentTheme.textColor }}>{item.libraryName}</Text> ➔{' '}
                                  <Text style={{ fontWeight: 'bold', color: currentTheme.textColor }}>{item.shelfName}</Text>'in{' '}
                                  <Text style={{ fontWeight: 'bold', color: currentTheme.textColor }}>{item.orderNo}. sırası</Text>
                                </Text>
                              </TouchableOpacity>
                          )}
                          ListEmptyComponent={
                            <Text style={[styles.emptyText, { color: currentTheme.subTextColor }]}>
                              {searchQuery ? 'Öge bulunamadı.' : 'Arama yapmak için yazın.'}
                            </Text>
                          }
                      />
                    </View>
                )}

                {/* TAB 3: İSTATİSTİKLER & PLANLAMA */}
                {activeTab === 'stats' && (
                    <ScrollView style={styles.tabContent}>
                      <Text style={[styles.faintTitle, { color: currentTheme.textColor }]}>Rapor & Ajanda</Text>

                      {/* AJANDA VE HEDEF TAKİBİ */}
                      <Text style={[styles.sectionSubtitleText, { color: currentTheme.textColor }]}>📅 Günlük & Aylık Okuma Planı:</Text>
                      <View style={[styles.plannerCard, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
                        <View style={styles.plannerRow}>
                          <Text style={[styles.plannerLabel, { color: currentTheme.textColor }]}>Günlük Sayfa Hedefi:</Text>
                          <View style={styles.plannerInputGroup}>
                            <TextInput
                                style={[styles.plannerInput, { backgroundColor: currentTheme.inputBg, color: currentTheme.textColor }]}
                                keyboardType="numeric"
                                value={goals.dailyPageCurrent}
                                onChangeText={(v) => setGoals({ ...goals, dailyPageCurrent: v })}
                            />
                            <Text style={{ color: currentTheme.subTextColor }}> / </Text>
                            <TextInput
                                style={[styles.plannerInput, { backgroundColor: currentTheme.inputBg, color: currentTheme.textColor }]}
                                keyboardType="numeric"
                                value={goals.dailyPageTarget}
                                onChangeText={(v) => setGoals({ ...goals, dailyPageTarget: v })}
                            />
                            <Text style={{ color: currentTheme.subTextColor }}> Sayfa</Text>
                          </View>
                        </View>

                        <View style={styles.plannerRow}>
                          <Text style={[styles.plannerLabel, { color: currentTheme.textColor }]}>Haftalık Biten Öge:</Text>
                          <View style={styles.plannerInputGroup}>
                            <TextInput
                                style={[styles.plannerInput, { backgroundColor: currentTheme.inputBg, color: currentTheme.textColor }]}
                                keyboardType="numeric"
                                value={goals.weeklyCurrent}
                                onChangeText={(v) => setGoals({ ...goals, weeklyCurrent: v })}
                            />
                            <Text style={{ color: currentTheme.subTextColor }}> / </Text>
                            <TextInput
                                style={[styles.plannerInput, { backgroundColor: currentTheme.inputBg, color: currentTheme.textColor }]}
                                keyboardType="numeric"
                                value={goals.weeklyTarget}
                                onChangeText={(v) => setGoals({ ...goals, weeklyTarget: v })}
                            />
                            <Text style={{ color: currentTheme.subTextColor }}> Adet</Text>
                          </View>
                        </View>

                        <View style={styles.plannerRow}>
                          <Text style={[styles.plannerLabel, { color: currentTheme.textColor }]}>Aylık Biten Öge:</Text>
                          <View style={styles.plannerInputGroup}>
                            <TextInput
                                style={[styles.plannerInput, { backgroundColor: currentTheme.inputBg, color: currentTheme.textColor }]}
                                keyboardType="numeric"
                                value={goals.monthlyCurrent}
                                onChangeText={(v) => setGoals({ ...goals, monthlyCurrent: v })}
                            />
                            <Text style={{ color: currentTheme.subTextColor }}> / </Text>
                            <TextInput
                                style={[styles.plannerInput, { backgroundColor: currentTheme.inputBg, color: currentTheme.textColor }]}
                                keyboardType="numeric"
                                value={goals.monthlyTarget}
                                onChangeText={(v) => setGoals({ ...goals, monthlyTarget: v })}
                            />
                            <Text style={{ color: currentTheme.subTextColor }}> Adet</Text>
                          </View>
                        </View>
                      </View>

                      <Text style={[styles.sectionSubtitleText, { color: currentTheme.textColor, marginTop: 15 }]}>📊 Koleksiyon İstatistikleri:</Text>
                      <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
                          <Text style={[styles.statNumber, { color: currentTheme.textColor }]}>{totalLibraries}</Text>
                          <Text style={[styles.statLabel, { color: currentTheme.subTextColor }]}>Kitaplık</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
                          <Text style={[styles.statNumber, { color: currentTheme.textColor }]}>{totalShelves}</Text>
                          <Text style={[styles.statLabel, { color: currentTheme.subTextColor }]}>Raf</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
                          <Text style={[styles.statNumber, { color: currentTheme.textColor }]}>{totalItemsCount}</Text>
                          <Text style={[styles.statLabel, { color: currentTheme.subTextColor }]}>Toplam Öge</Text>
                        </View>
                      </View>

                      <View style={[styles.progressContainer, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
                        <Text style={[styles.sectionSubtitleText, { color: currentTheme.textColor }]}>
                          Tamamlanma Oranı: %{completionPercentage} ({completedItemsCount}/{totalItemsCount})
                        </Text>
                        <View style={styles.progressBarBackground}>
                          <View style={[styles.progressBarFill, { width: `${completionPercentage}%` }]} />
                        </View>
                      </View>

                      <Text style={[styles.sectionSubtitleText, { color: currentTheme.textColor }]}>Tür Dağılımı:</Text>
                      {typeCounts.map((tc, idx) => (
                          <View key={idx} style={[styles.typeStatRow, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
                            <Text style={[styles.typeStatName, { color: currentTheme.textColor }]}>{tc.type}</Text>
                            <Text style={styles.typeStatCount}>{tc.count} adet</Text>
                          </View>
                      ))}
                    </ScrollView>
                )}

                {/* TAB 4: AYARLAR VE KARANLIK MOD */}
                {activeTab === 'settings' && (
                    <ScrollView style={styles.tabContent}>
                      <Text style={[styles.faintTitle, { color: currentTheme.textColor }]}>Ayarlar</Text>

                      {/* KARANLIK MOD SWITCH */}
                      <View style={[styles.settingSwitchRow, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
                        <Text style={[styles.settingSwitchLabel, { color: currentTheme.textColor }]}>🌙 Karanlık Mod (Dark Theme)</Text>
                        <Switch
                            value={isDarkMode}
                            onValueChange={(val) => {
                              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                              setIsDarkMode(val);
                            }}
                            trackColor={{ false: '#767577', true: '#B89252' }}
                        />
                      </View>

                      <Text style={[styles.sectionSubtitleText, { color: currentTheme.textColor }]}>Mevcut Öge Türleri (Prefab):</Text>
                      <View style={styles.typeChipContainer}>
                        {itemTypes.map((type, idx) => (
                            <View key={idx} style={styles.typeChip}>
                              <Text style={styles.typeChipText}>{type}</Text>
                            </View>
                        ))}
                      </View>

                      <View style={styles.addTypeRow}>
                        <TextInput
                            style={[styles.typeInput, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border, color: currentTheme.textColor }]}
                            placeholder="Yeni Tür (Örn: Figür)"
                            placeholderTextColor="#A89A8B"
                            value={newTypeName}
                            onChangeText={setNewTypeName}
                        />
                        <TouchableOpacity style={[styles.addTypeBtn, { backgroundColor: currentTheme.coverBg }]} onPress={handleAddType}>
                          <Text style={styles.addTypeBtnText}>+ Ekle</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.sectionSubtitleText, { color: currentTheme.textColor, marginTop: 20 }]}>💾 Veri Yedekleme (JSON):</Text>
                      <TouchableOpacity
                          style={[styles.backupBtn, { backgroundColor: currentTheme.coverBg }]}
                          onPress={() => setIsImportModalOpen(true)}
                      >
                        <Text style={styles.backupBtnText}>📥 JSON Yedek Yükle / Aktar</Text>
                      </TouchableOpacity>
                    </ScrollView>
                )}
              </View>

              {/* DİKEY AYRAÇLAR */}
              <View style={styles.bookmarkContainer}>
                <TouchableOpacity
                    style={[
                      styles.bookmark,
                      { backgroundColor: '#9E4743' },
                      activeTab === 'library' && styles.activeBookmark,
                    ]}
                    onPress={() => setActiveTab('library')}
                >
                  <Text style={styles.bookmarkText}>Library</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                      styles.bookmark,
                      { backgroundColor: '#4A769B' },
                      activeTab === 'search' && styles.activeBookmark,
                    ]}
                    onPress={() => setActiveTab('search')}
                >
                  <Text style={styles.bookmarkText}>Search</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                      styles.bookmark,
                      { backgroundColor: '#D99B26' },
                      activeTab === 'stats' && styles.activeBookmark,
                    ]}
                    onPress={() => setActiveTab('stats')}
                >
                  <Text style={styles.bookmarkText}>Planner</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                      styles.bookmark,
                      { backgroundColor: '#5C785B' },
                      activeTab === 'settings' && styles.activeBookmark,
                    ]}
                    onPress={() => setActiveTab('settings')}
                >
                  <Text style={styles.bookmarkText}>Settings</Text>
                </TouchableOpacity>
              </View>
            </View>
          </PanGestureHandler>

          {/* 3D KAPAK */}
          {(!isBookOpen || dragProgress.value < 1) && (
              <PanGestureHandler onGestureEvent={onGestureEventOpen} onHandlerStateChange={onGestureEndOpen}>
                <Animated.View style={[styles.coverOverlay, cover3DAnimatedStyle, { backgroundColor: currentTheme.coverBg }]}>
                  <View style={styles.coverInnerFrame}>
                    <Text style={styles.coverSubTag}>A PERSONAL COLLECTION</Text>
                    <Text style={styles.coverBookIcon}>📖</Text>
                    <Text style={styles.coverMainTitle}>MY{'\n'}LIBRARY</Text>
                    <View style={styles.coverDivider} />
                    <Text style={styles.coverItalicQuote}>
                      A place for every book.{'\n'}A story on every shelf.
                    </Text>
                    <View style={styles.coverFooterHint}>
                      <Text style={styles.coverArrow}>←</Text>
                      <Text style={styles.coverSwipeText}>SWIPE LEFT TO OPEN</Text>
                    </View>
                    <Text style={styles.coverBrandText}>My Book Shelf</Text>
                  </View>
                </Animated.View>
              </PanGestureHandler>
          )}

          {/* MODAL: EKLEME */}
          <Modal visible={!!modalType} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContainer, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
                <Text style={[styles.modalTitle, { color: currentTheme.textColor }]}>
                  {modalType === 'library' && 'Yeni Kitaplık Oluştur'}
                  {modalType === 'shelf' && 'Yeni Raf Oluştur'}
                  {modalType === 'item' && 'Yeni Öge Ekle'}
                </Text>

                <TextInput
                    style={[styles.modalInput, { backgroundColor: currentTheme.inputBg, borderColor: currentTheme.border, color: currentTheme.textColor }]}
                    placeholder={
                      modalType === 'library'
                          ? 'Örn: Salon Kitaplığı'
                          : modalType === 'shelf'
                              ? 'Örn: 1. Raf'
                              : 'Adı (Örn: The Witcher 3)'
                    }
                    placeholderTextColor="#A89A8B"
                    value={newItemTitle}
                    onChangeText={setNewItemTitle}
                />

                {modalType === 'item' && (
                    <>
                      <Text style={[styles.label, { color: currentTheme.subTextColor }]}>Tür Seçin (Prefab):</Text>
                      <View style={styles.typeSelectorRow}>
                        {itemTypes.map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                  styles.typeSelectBtn,
                                  selectedType === type && styles.typeSelectBtnActive,
                                ]}
                                onPress={() => setSelectedType(type)}
                            >
                              <Text
                                  style={[
                                    styles.typeSelectText,
                                    selectedType === type && styles.typeSelectTextActive,
                                  ]}
                              >
                                {type}
                              </Text>
                            </TouchableOpacity>
                        ))}
                      </View>

                      {/* KİTAP KAPAK RENGİ SEÇİCİ */}
                      <Text style={[styles.label, { color: currentTheme.subTextColor }]}>Kapak Rengi Seçin:</Text>
                      <View style={styles.colorPaletteRow}>
                        {BOOK_COLORS.map((clr) => (
                            <TouchableOpacity
                                key={clr}
                                style={[
                                  styles.colorCircle,
                                  { backgroundColor: clr },
                                  selectedCoverColor === clr && styles.selectedColorCircle,
                                ]}
                                onPress={() => setSelectedCoverColor(clr)}
                            />
                        ))}
                      </View>

                      <TextInput
                          style={[styles.modalInput, { backgroundColor: currentTheme.inputBg, borderColor: currentTheme.border, color: currentTheme.textColor }]}
                          placeholder="Raftaki Sırası (Opsiyonel)"
                          placeholderTextColor="#A89A8B"
                          keyboardType="numeric"
                          value={newOrderNo}
                          onChangeText={setNewOrderNo}
                      />
                    </>
                )}

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: '#95A5A6' }]}
                      onPress={() => setModalType(null)}
                  >
                    <Text style={styles.modalButtonText}>İptal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: '#B89252' }]}
                      onPress={handleAddItem}
                  >
                    <Text style={styles.modalButtonText}>Ekle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* MODAL: DETAY */}
          <Modal visible={!!detailItem} animationType="fade" transparent={true}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContainer, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
                <Text style={[styles.modalTitle, { color: currentTheme.textColor }]}>📝 {detailItem?.title} (Detaylar)</Text>

                <Text style={[styles.label, { color: currentTheme.subTextColor }]}>Durum Seçimi (Opsiyonel):</Text>
                <View style={styles.typeSelectorRow}>
                  {['Başlanmadı', 'Okunuyor/Oynanıyor', 'Tamamlandı', 'İstek Listesi'].map((st) => (
                      <TouchableOpacity
                          key={st}
                          style={[styles.typeSelectBtn, editStatus === st && styles.typeSelectBtnActive]}
                          onPress={() => setEditStatus(st)}
                      >
                        <Text
                            style={[
                              styles.typeSelectText,
                              editStatus === st && styles.typeSelectTextActive,
                            ]}
                        >
                          {st}
                        </Text>
                      </TouchableOpacity>
                  ))}
                </View>

                {/* KİTAP KAPAK RENGİ DEĞİŞTİRME */}
                <Text style={[styles.label, { color: currentTheme.subTextColor }]}>Kapak Rengini Değiştir:</Text>
                <View style={styles.colorPaletteRow}>
                  {BOOK_COLORS.map((clr) => (
                      <TouchableOpacity
                          key={clr}
                          style={[
                            styles.colorCircle,
                            { backgroundColor: clr },
                            editCoverColor === clr && styles.selectedColorCircle,
                          ]}
                          onPress={() => setEditCoverColor(clr)}
                      />
                  ))}
                </View>

                <Text style={[styles.label, { color: currentTheme.subTextColor }]}>Kalınan Yer / İlerleme (Opsiyonel):</Text>
                <TextInput
                    style={[styles.modalInput, { backgroundColor: currentTheme.inputBg, borderColor: currentTheme.border, color: currentTheme.textColor }]}
                    placeholder="Örn: Sayfa 145 veya %60"
                    placeholderTextColor="#A89A8B"
                    value={editProgress}
                    onChangeText={setEditProgress}
                />

                <Text style={[styles.label, { color: currentTheme.subTextColor }]}>Kişisel Not (Opsiyonel):</Text>
                <TextInput
                    style={[styles.modalInput, { height: 70, textAlignVertical: 'top', backgroundColor: currentTheme.inputBg, borderColor: currentTheme.border, color: currentTheme.textColor }]}
                    placeholder="Örn: Arkadaşa ödünç verdim..."
                    placeholderTextColor="#A89A8B"
                    multiline={true}
                    value={editNote}
                    onChangeText={setEditNote}
                />

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: '#95A5A6' }]}
                      onPress={() => setDetailItem(null)}
                  >
                    <Text style={styles.modalButtonText}>Kapat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: '#B89252' }]}
                      onPress={saveItemDetails}
                  >
                    <Text style={styles.modalButtonText}>Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* MODAL: JSON IMPORT */}
          <Modal visible={isImportModalOpen} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContainer, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }]}>
                <Text style={[styles.modalTitle, { color: currentTheme.textColor }]}>📥 JSON Veri Yükleme</Text>
                <Text style={[styles.label, { color: currentTheme.subTextColor }]}>Yedek JSON Metnini Buraya Yapıştırın:</Text>
                <TextInput
                    style={[styles.modalInput, { height: 100, textAlignVertical: 'top', backgroundColor: currentTheme.inputBg, borderColor: currentTheme.border, color: currentTheme.textColor }]}
                    placeholder='[{"id":"1", "name":"Kitaplık", ...}]'
                    placeholderTextColor="#A89A8B"
                    multiline={true}
                    value={jsonInput}
                    onChangeText={setJsonInput}
                />

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: '#95A5A6' }]}
                      onPress={() => setIsImportModalOpen(false)}
                  >
                    <Text style={styles.modalButtonText}>İptal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: '#1E2D3B' }]}
                      onPress={handleImportJSON}
                  >
                    <Text style={styles.modalButtonText}>Yükle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    padding: 25,
  },
  coverInnerFrame: {
    flex: 1,
    width: '100%',
    borderWidth: 1,
    borderColor: '#B89252',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coverSubTag: {
    fontSize: 11,
    color: '#B89252',
    letterSpacing: 2,
    fontWeight: '600',
    marginTop: 20,
  },
  coverBookIcon: {
    fontSize: 42,
    color: '#B89252',
  },
  coverMainTitle: {
    fontSize: 34,
    color: '#B89252',
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: '300',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  coverDivider: {
    width: 40,
    height: 1,
    backgroundColor: '#B89252',
  },
  coverItalicQuote: {
    fontSize: 15,
    color: '#D1C2A5',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  coverFooterHint: {
    alignItems: 'center',
    marginBottom: 10,
  },
  coverArrow: {
    fontSize: 18,
    color: '#B89252',
    marginBottom: 4,
  },
  coverSwipeText: {
    fontSize: 11,
    color: '#B89252',
    letterSpacing: 2,
    fontWeight: '600',
  },
  coverBrandText: {
    fontSize: 13,
    color: '#B89252',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  pageBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 35 : 15,
  },
  tabContent: {
    flex: 1,
  },
  subHeaderTag: {
    fontSize: 10,
    color: '#B89252',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 5,
  },
  faintTitle: {
    fontSize: 26,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  addCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCircleButtonText: {
    color: '#F5EFEB',
    fontSize: 22,
    fontWeight: '300',
  },
  searchBarFake: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  searchBarPlaceholder: {
    color: '#A89A8B',
    fontSize: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  sectionMetaText: {
    fontSize: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  cardMain: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 2,
  },
  woodShelfPreview: {
    height: 110,
    backgroundColor: '#6E4729',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingBottom: 6,
    borderBottomWidth: 6,
    borderBottomColor: '#4A2E17',
  },
  emptyShelfLabel: {
    color: '#D1C2A5',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  bookCoverMock: {
    width: 65,
    height: 90,
    borderRadius: 3,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  bookCoverText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 10,
  },
  cardBottomInfo: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  deleteBtn: {
    backgroundColor: '#FADBD8',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 16,
  },
  makeRoomButton: {
    borderWidth: 1,
    borderColor: '#B89252',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  makeRoomButtonText: {
    color: '#B89252',
    fontSize: 14,
    fontWeight: '600',
  },
  itemCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  orderActions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  arrowText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#D5C9BD',
  },
  orderBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  itemCardMain: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemTitleText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  statusBadge: {
    fontSize: 11,
    backgroundColor: '#EFE8E1',
    color: '#5C4E43',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 11,
  },
  noteSnippet: {
    fontSize: 11,
    color: '#B89252',
    fontStyle: 'italic',
    marginTop: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeTag: {
    backgroundColor: '#F5EFEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#B89252',
  },
  typeTagText: {
    fontSize: 11,
    color: '#B89252',
    fontWeight: 'bold',
  },
  searchInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 15,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
  },
  typeChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  typeChip: {
    backgroundColor: '#EFE8E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  typeChipText: {
    fontSize: 13,
    color: '#2C221E',
    fontWeight: '600',
  },
  addTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addTypeBtn: {
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  addTypeBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  backupBtn: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  backupBtnText: {
    color: '#F5EFEB',
    fontWeight: 'bold',
  },
  sectionSubtitleText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
  },
  statCard: {
    flex: 0.31,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  progressContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#EFE8E1',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#B89252',
  },
  typeStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
  },
  typeStatName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  typeStatCount: {
    fontSize: 14,
    color: '#B89252',
    fontWeight: '600',
  },
  bookmarkContainer: {
    width: 48,
    justifyContent: 'flex-start',
    paddingTop: 80,
    alignItems: 'center',
    gap: 16,
  },
  bookmark: {
    width: 42,
    paddingVertical: 18,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  activeBookmark: {
    width: 52,
  },
  bookmarkText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 11,
    transform: [{ rotate: '90deg' }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 8,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  typeSelectBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#EFE8E1',
    borderWidth: 1,
    borderColor: '#E2D7CB',
  },
  typeSelectBtnActive: {
    backgroundColor: '#1E2D3B',
    borderColor: '#1E2D3B',
  },
  typeSelectText: {
    fontSize: 11,
    color: '#2C221E',
  },
  typeSelectTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  colorPaletteRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  selectedColorCircle: {
    borderWidth: 3,
    borderColor: '#B89252',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    fontSize: 13,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 0.48,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  backButtonContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
    marginTop: 5,
  },
  backButtonText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  settingSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 15,
  },
  settingSwitchLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  plannerCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 15,
  },
  plannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  plannerLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  plannerInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plannerInput: {
    width: 40,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 13,
  },
});