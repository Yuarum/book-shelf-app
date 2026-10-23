import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    Dimensions,
    FlatList,
    Modal,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function App() {
    const [isBookOpen, setIsBookOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('library');

    // Örnek Başlangıç Verileri
    const [books, setBooks] = useState([
        { id: '1', title: 'Dune', shelfName: 'Salon Kitaplığı', shelfNo: '2. Raf', positionNo: '3. Sıra' },
        { id: '2', title: '1984', shelfName: 'Çalışma Odası', shelfNo: '1. Raf', positionNo: '5. Sıra' },
        { id: '3', title: 'The Witcher 3', shelfName: 'Oyun Rafı', shelfNo: '3. Raf', positionNo: '1. Sıra' },
    ]);

    // Modal ve Form State'leri
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newShelfName, setNewShelfName] = useState('');
    const [newShelfNo, setNewShelfNo] = useState('');
    const [newPositionNo, setNewPositionNo] = useState('');

    // Arama State'i
    const [searchQuery, setSearchQuery] = useState('');

    // Kapak Animasyonu
    const translateX = useSharedValue(0);

    const onGestureEvent = (event) => {
        if (event.nativeEvent.translationX < -50) {
            translateX.value = withSpring(-SCREEN_WIDTH, {}, () => {
                runOnJS(setIsBookOpen)(true);
            });
        }
    };

    const coverAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const resetCover = () => {
        translateX.value = withSpring(0);
        setIsBookOpen(false);
    };

    const handleAddBook = () => {
        if (!newTitle || !newShelfName) return;

        const newEntry = {
            id: Date.now().toString(),
            title: newTitle,
            shelfName: newShelfName,
            shelfNo: newShelfNo || '1. Raf',
            positionNo: newPositionNo || '1. Sıra',
        };

        setBooks([newEntry, ...books]);
        setNewTitle('');
        setNewShelfName('');
        setNewShelfNo('');
        setNewPositionNo('');
        setIsModalVisible(false);
    };

    const filteredBooks = books.filter((book) =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                {/* === ANA SAYFA İÇERİĞİ === */}
                <View style={styles.mainContent}>
                    <View style={styles.pageBody}>
                        {/* 📚 KİTAPLIK SEKME İÇERİĞİ */}
                        {activeTab === 'library' && (
                            <View style={styles.tabContent}>
                                <View style={styles.headerRow}>
                                    <Text style={styles.title}>📚 Kitaplığım</Text>
                                    <TouchableOpacity
                                        style={styles.addMiniButton}
                                        onPress={() => setIsModalVisible(true)}
                                    >
                                        <Text style={styles.addMiniButtonText}>+ Ekle</Text>
                                    </TouchableOpacity>
                                </View>

                                <FlatList
                                    data={books}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <View style={styles.bookCard}>
                                            <Text style={styles.bookTitle}>{item.title}</Text>
                                            <View style={styles.locationTag}>
                                                <Text style={styles.locationText}>
                                                    📍 {item.shelfName} • {item.shelfNo} • {item.positionNo}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                    ListEmptyComponent={
                                        <Text style={styles.emptyText}>Henüz hiç kitap eklenmemiş.</Text>
                                    }
                                />
                            </View>
                        )}

                        {/* 🔍 ARAMA SEKME İÇERİĞİ */}
                        {activeTab === 'search' && (
                            <View style={styles.tabContent}>
                                <Text style={styles.title}>🔍 Akıllı Arama</Text>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Kitap veya oyun adı yazın..."
                                    placeholderTextColor="#888"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />

                                <FlatList
                                    data={filteredBooks}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <View style={styles.searchResultCard}>
                                            <Text style={styles.searchBookTitle}>{item.title}</Text>
                                            <Text style={styles.searchLocationInfo}>
                                                Konum: <Text style={styles.highlight}>{item.shelfName}</Text> içinde{' '}
                                                <Text style={styles.highlight}>{item.shelfNo}</Text>,{' '}
                                                <Text style={styles.highlight}>{item.positionNo}</Text>
                                            </Text>
                                        </View>
                                    )}
                                    ListEmptyComponent={
                                        <Text style={styles.emptyText}>
                                            {searchQuery ? 'Eşleşen ürün bulunamadı.' : 'Arama yapmak için yukarıya yazın.'}
                                        </Text>
                                    }
                                />
                            </View>
                        )}

                        {/* ⚙️ AYARLAR SEKME İÇERİĞİ */}
                        {activeTab === 'settings' && (
                            <View style={styles.tabContent}>
                                <Text style={styles.title}>⚙️ Ayarlar</Text>
                                <TouchableOpacity style={styles.closeCoverButton} onPress={resetCover}>
                                    <Text style={styles.closeCoverText}>📖 Kapağı Kapat</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Sağ Dikey Ayraçlar */}
                    <View style={styles.bookmarkContainer}>
                        <TouchableOpacity
                            style={[
                                styles.bookmark,
                                { backgroundColor: '#E74C3C' },
                                activeTab === 'library' && styles.activeBookmark,
                            ]}
                            onPress={() => setActiveTab('library')}
                        >
                            <Text style={styles.bookmarkText}>Kitaplık</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.bookmark,
                                { backgroundColor: '#3498DB' },
                                activeTab === 'search' && styles.activeBookmark,
                            ]}
                            onPress={() => setActiveTab('search')}
                        >
                            <Text style={styles.bookmarkText}>Arama</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.bookmark,
                                { backgroundColor: '#2ECC71' },
                                activeTab === 'settings' && styles.activeBookmark,
                            ]}
                            onPress={() => setActiveTab('settings')}
                        >
                            <Text style={styles.bookmarkText}>Ayarlar</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* === KİTAP/RAF EKLEME MODALI === */}
                <Modal visible={isModalVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Yeni Kitap / Oyun Ekle</Text>

                            <TextInput
                                style={styles.modalInput}
                                placeholder="Kitap / Oyun Adı (Örn: Harry Potter)"
                                value={newTitle}
                                onChangeText={setNewTitle}
                            />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Kitaplık/Kategori Adı (Örn: Salon Kitaplığı)"
                                value={newShelfName}
                                onChangeText={setNewShelfName}
                            />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Raf Numarası/Adı (Örn: 2. Raf)"
                                value={newShelfNo}
                                onChangeText={setNewShelfNo}
                            />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Sıra Numarası (Örn: 4. Sıra)"
                                value={newPositionNo}
                                onChangeText={setNewPositionNo}
                            />

                            <View style={styles.modalButtonRow}>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: '#95A5A6' }]}
                                    onPress={() => setIsModalVisible(false)}
                                >
                                    <Text style={styles.modalButtonText}>İptal</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: '#2ECC71' }]}
                                    onPress={handleAddBook}
                                >
                                    <Text style={styles.modalButtonText}>Kaydet</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* === KİTAP KAPAĞI === */}
                {!isBookOpen && (
                    <PanGestureHandler onGestureEvent={onGestureEvent}>
                        <Animated.View style={[styles.coverOverlay, coverAnimatedStyle]}>
                            <Text style={styles.coverTitle}>KİŞİSEL KİTAPLIĞIM</Text>
                            <Text style={styles.coverInstruction}>Açmak için sola kaydırın ◄</Text>
                        </Animated.View>
                    </PanGestureHandler>
                )}
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5EBE0',
    },
    coverOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#2C3E50',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        elevation: 10,
    },
    coverTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#F1C40F',
        letterSpacing: 2,
        marginBottom: 20,
    },
    coverInstruction: {
        fontSize: 14,
        color: '#BDC3C7',
        fontStyle: 'italic',
    },
    mainContent: {
        flex: 1,
        flexDirection: 'row',
    },
    pageBody: {
        flex: 1,
        padding: 15,
    },
    tabContent: {
        flex: 1,
        marginTop: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    addMiniButton: {
        backgroundColor: '#8E44AD',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 6,
    },
    addMiniButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    bookCard: {
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#8E44AD',
    },
    bookTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    locationTag: {
        marginTop: 6,
    },
    locationText: {
        fontSize: 13,
        color: '#7F8C8D',
    },
    searchInput: {
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DDD',
        fontSize: 15,
        marginBottom: 15,
    },
    searchResultCard: {
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#3498DB',
    },
    searchBookTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    searchLocationInfo: {
        marginTop: 5,
        fontSize: 13,
        color: '#555',
    },
    highlight: {
        fontWeight: 'bold',
        color: '#2980B9',
    },
    emptyText: {
        textAlign: 'center',
        color: '#888',
        marginTop: 30,
    },
    closeCoverButton: {
        backgroundColor: '#C0392B',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    closeCoverText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    bookmarkContainer: {
        width: 55,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15,
    },
    bookmark: {
        width: 45,
        paddingVertical: 18,
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeBookmark: {
        width: 55,
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
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#2C3E50',
    },
    modalInput: {
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 6,
        padding: 10,
        marginBottom: 10,
        fontSize: 14,
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
});