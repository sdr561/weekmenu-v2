import { useState, useEffect } from 'react';
import { Plus, Trash2, ShoppingCart, ChefHat, Calendar, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';

const WeekMenuPlanner = ({ userId, userEmail }) => {
  console.log('WeekMenuPlanner props:', { userId, userEmail });
  const [gerechten, setGerechten] = useState([]);
  const [weekMenu, setWeekMenu] = useState({});
  const [activeTab, setActiveTab] = useState('menu');
  const [showAddGerecht, setShowAddGerecht] = useState(false);
  const [editingGerechtId, setEditingGerechtId] = useState(null);
  const [loading, setLoading] = useState(true);
 
  
  const [nieuwGerecht, setNieuwGerecht] = useState({
    naam: '',
    bereidingstijd: 30,
    ingredienten: [{ naam: '', hoeveelheid: '', eenheid: 'gram', winkel: 'Appie' }]
  });

  const [extraBoodschappen, setExtraBoodschappen] = useState([]);
  const [verwijderdeBoodschappen, setVerwijderdeBoodschappen] = useState([]);
  const [afgevinkteBoodschappen, setAfgevinkteBoodschappen] = useState([]);
  const [showAddBoodschap, setShowAddBoodschap] = useState(false);
  const [nieuweBoodschap, setNieuweBoodschap] = useState({ naam: '', categorie: 'Overig', winkel: 'Appie' });
  const [editingBoodschapKey, setEditingBoodschapKey] = useState(null);
  const [boodschappenWeergave, setBoodschappenWeergave] = useState('categorie');
  const [vaakGekocht, setVaakGekocht] = useState([]);
  const [customInput, setCustomInput] = useState(false);

  const dagen = ['Zaterdag', 'Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];
  const eenheden = ['gram', 'kg', 'ml', 'liter', 'stuks', 'eetlepels', 'theelepels'];
  const winkels = ['Appie', 'Netto', 'Visboer', 'Slager', 'Overig'];
  
  const categorieën = [
    'Groente & Fruit',
    'Vlees & Vis',
    'Zuivel & Eieren',
    'Brood & Bakkerij',
    'Rijst, Pasta & Peulvruchten',
    'Conserven & Sauzen',
    'Dranken',
    'Snacks & Snoep',
    'Diepvries',
    'Overig'
  ];

  const voorgesteldeItems = [
    { naam: 'Bananen', categorie: 'Groente & Fruit', winkel: 'Appie' },
    { naam: 'Appels', categorie: 'Groente & Fruit', winkel: 'Appie' },
    { naam: 'Sinaasappels', categorie: 'Groente & Fruit', winkel: 'Appie' },
    { naam: 'Melk', categorie: 'Zuivel & Eieren', winkel: 'Appie' },
    { naam: 'Yoghurt', categorie: 'Zuivel & Eieren', winkel: 'Appie' },
    { naam: 'Kaas', categorie: 'Zuivel & Eieren', winkel: 'Appie' },
    { naam: 'Eieren', categorie: 'Zuivel & Eieren', winkel: 'Appie' },
    { naam: 'Boter', categorie: 'Zuivel & Eieren', winkel: 'Appie' },
    { naam: 'Brood', categorie: 'Brood & Bakkerij', winkel: 'Appie' },
    { naam: 'Cola', categorie: 'Dranken', winkel: 'Appie' },
    { naam: 'Chips', categorie: 'Snacks & Snoep', winkel: 'Appie' },
  ];

  // Get current user's family ID
const familyId = userId;  

  // Realtime listeners for Firestore
  useEffect(() => {
    if (!familyId) return;

    // Listen to gerechten
    const gerechtenRef = collection(db, 'families', familyId, 'gerechten');
    const unsubGerechten = onSnapshot(gerechtenRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGerechten(data);
    });

    // Listen to weekmenu
    const weekmenuRef = doc(db, 'families', familyId, 'weekmenus', 'current');
    const unsubWeekmenu = onSnapshot(weekmenuRef, (docSnap) => {
      if (docSnap.exists()) {
        setWeekMenu(docSnap.data().weekMenu || {});
      } else {
        // Initialize empty week
        const emptyWeek = {};
        dagen.forEach(dag => {
          emptyWeek[dag] = {
            maaltijden: [{ gerechtId: null, aantalPersonen: 4, tijd: '18:00' }]
          };
        });
        setWeekMenu(emptyWeek);
      }
    });

    // Listen to boodschappen
    const boodschappenRef = doc(db, 'families', familyId, 'boodschappen', 'current');
    const unsubBoodschappen = onSnapshot(boodschappenRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setExtraBoodschappen(data.extraBoodschappen || []);
        setVerwijderdeBoodschappen(data.verwijderdeBoodschappen || []);
        setAfgevinkteBoodschappen(data.afgevinkteBoodschappen || []);
        setVaakGekocht(data.vaakGekocht || []);
      }
    });

    setLoading(false);

    return () => {
      unsubGerechten();
      unsubWeekmenu();
      unsubBoodschappen();
    };
  }, [familyId]);

  // Auto-categorize and detect shop
  const getCategorieVoorIngredient = (ingredientNaam) => {
    const naam = ingredientNaam.toLowerCase();
    if (naam.includes('ui') || naam.includes('tomaat') || naam.includes('paprika') || 
        naam.includes('broccoli') || naam.includes('sperzieboon') || naam.includes('wortel') ||
        naam.includes('sla') || naam.includes('komkommer') || naam.includes('appel') ||
        naam.includes('banaan') || naam.includes('sinaasappel')) return 'Groente & Fruit';
    if (naam.includes('kip') || naam.includes('gehakt') || naam.includes('vlees') || 
        naam.includes('zalm') || naam.includes('vis') || naam.includes('kabeljauw')) return 'Vlees & Vis';
    if (naam.includes('melk') || naam.includes('kaas') || naam.includes('yoghurt') || 
        naam.includes('boter') || naam.includes('ei')) return 'Zuivel & Eieren';
    if (naam.includes('brood') || naam.includes('croissant')) return 'Brood & Bakkerij';
    if (naam.includes('rijst') || naam.includes('pasta') || naam.includes('spaghetti') || 
        naam.includes('noedel') || naam.includes('boon') || naam.includes('linzen')) return 'Rijst, Pasta & Peulvruchten';
    if (naam.includes('saus') || naam.includes('tomatensaus') || naam.includes('pesto') || 
        naam.includes('olie') || naam.includes('azijn') || naam.includes('knoflook')) return 'Conserven & Sauzen';
    if (naam.includes('cola') || naam.includes('sap') || naam.includes('water') || 
        naam.includes('wijn') || naam.includes('bier') || naam.includes('thee') || naam.includes('koffie')) return 'Dranken';
    if (naam.includes('chips') || naam.includes('koek') || naam.includes('chocolade') || naam.includes('snoep')) return 'Snacks & Snoep';
    if (naam.includes('ijs') || naam.includes('diepvries')) return 'Diepvries';
    return 'Overig';
  };

  const getWinkelVoorIngredient = (ingredientNaam) => {
    const naam = ingredientNaam.toLowerCase();
    if (naam.includes('zalm') || naam.includes('vis') || naam.includes('kabeljauw') || 
        naam.includes('garnaal') || naam.includes('mosselen')) return 'Visboer';
    if (naam.includes('gehakt') || naam.includes('biefstuk') || naam.includes('varkenshaas') || 
        naam.includes('lamsvlees') || naam.includes('worst')) return 'Slager';
    return 'Appie';
  };

  // Gerecht functions with Firestore
  const saveGerecht = async () => {
    if (!nieuwGerecht.naam.trim()) {
      alert('Geef het gerecht een naam');
      return;
    }
    const validIngredients = nieuwGerecht.ingredienten.filter(
      ing => ing.naam.trim() && ing.hoeveelheid
    );
    if (validIngredients.length === 0) {
      alert('Voeg minimaal één ingredient toe');
      return;
    }

    try {
      await addDoc(collection(db, 'families', familyId, 'gerechten'), {
        naam: nieuwGerecht.naam,
        bereidingstijd: nieuwGerecht.bereidingstijd,
        ingredienten: validIngredients,
        createdAt: new Date().toISOString()
      });
      
      setNieuwGerecht({
        naam: '',
        bereidingstijd: 30,
        ingredienten: [{ naam: '', hoeveelheid: '', eenheid: 'gram', winkel: 'Appie' }]
      });
      setShowAddGerecht(false);
    } catch (error) {
      console.error('Error saving gerecht:', error);
      alert('Fout bij opslaan');
    }
  };

  const deleteGerecht = async (id) => {
    if (window.confirm('Weet je zeker dat je dit gerecht wilt verwijderen?')) {
      try {
        await deleteDoc(doc(db, 'families', familyId, 'gerechten', id));
        
        // Remove from weekmenu
        const updatedWeekMenu = { ...weekMenu };
        Object.keys(updatedWeekMenu).forEach(dag => {
          updatedWeekMenu[dag].maaltijden = updatedWeekMenu[dag].maaltijden.map(m => 
            m.gerechtId === id ? { ...m, gerechtId: null } : m
          );
        });
        await setDoc(doc(db, 'families', familyId, 'weekmenus', 'current'), {
          weekMenu: updatedWeekMenu,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error deleting gerecht:', error);
      }
    }
  };

  const updateGerecht = async (id, field, value) => {
    try {
      const gerechtRef = doc(db, 'families', familyId, 'gerechten', id);
      const gerecht = gerechten.find(g => g.id === id);
      await updateDoc(gerechtRef, {
        ...gerecht,
        [field]: value,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating gerecht:', error);
    }
  };

  const updateGerechtIngredient = async (gerechtId, ingredientIndex, field, value) => {
    try {
      const gerecht = gerechten.find(g => g.id === gerechtId);
      const updatedIngredients = [...gerecht.ingredienten];
      updatedIngredients[ingredientIndex] = {
        ...updatedIngredients[ingredientIndex],
        [field]: value
      };
      
      if (field === 'naam' && value) {
        updatedIngredients[ingredientIndex].winkel = getWinkelVoorIngredient(value);
      }
      
      await updateDoc(doc(db, 'families', familyId, 'gerechten', gerechtId), {
        ingredienten: updatedIngredients,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating ingredient:', error);
    }
  };

  const addIngredientField = () => {
    setNieuwGerecht({
      ...nieuwGerecht,
      ingredienten: [...nieuwGerecht.ingredienten, { naam: '', hoeveelheid: '', eenheid: 'gram', winkel: 'Appie' }]
    });
  };

  const updateIngredient = (index, field, value) => {
    const updated = [...nieuwGerecht.ingredienten];
    updated[index][field] = value;
    if (field === 'naam' && value) {
      updated[index].winkel = getWinkelVoorIngredient(value);
    }
    setNieuwGerecht({ ...nieuwGerecht, ingredienten: updated });
  };

  const removeIngredient = (index) => {
    const updated = nieuwGerecht.ingredienten.filter((_, i) => i !== index);
    setNieuwGerecht({ ...nieuwGerecht, ingredienten: updated });
  };

  const addIngredientToGerecht = async (gerechtId) => {
    const gerecht = gerechten.find(g => g.id === gerechtId);
    const updated = [...gerecht.ingredienten, { naam: '', hoeveelheid: '', eenheid: 'gram', winkel: 'Appie' }];
    
    try {
      await updateDoc(doc(db, 'families', familyId, 'gerechten', gerechtId), {
        ingredienten: updated
      });
    } catch (error) {
      console.error('Error adding ingredient:', error);
    }
  };

  const removeIngredientFromGerecht = async (gerechtId, ingredientIndex) => {
    const gerecht = gerechten.find(g => g.id === gerechtId);
    if (gerecht.ingredienten.length <= 1) return;
    
    const updated = gerecht.ingredienten.filter((_, idx) => idx !== ingredientIndex);
    
    try {
      await updateDoc(doc(db, 'families', familyId, 'gerechten', gerechtId), {
        ingredienten: updated
      });
    } catch (error) {
      console.error('Error removing ingredient:', error);
    }
  };

  // Weekmenu functions
  const addMaaltijd = (dag) => {
    const updated = { ...weekMenu };
    updated[dag].maaltijden.push({
      gerechtId: null,
      aantalPersonen: 2,
      tijd: '18:00'
    });
    saveWeekmenu(updated);
  };

  const removeMaaltijd = (dag, index) => {
    const updated = { ...weekMenu };
    if (updated[dag].maaltijden.length > 1) {
      updated[dag].maaltijden = updated[dag].maaltijden.filter((_, i) => i !== index);
      saveWeekmenu(updated);
    }
  };

  const updateMaaltijd = (dag, index, field, value) => {
    const updated = { ...weekMenu };
    updated[dag].maaltijden[index][field] = value;
    saveWeekmenu(updated);
  };

  const saveWeekmenu = async (updatedWeekMenu) => {
    try {
      await setDoc(doc(db, 'families', familyId, 'weekmenus', 'current'), {
        weekMenu: updatedWeekMenu,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving weekmenu:', error);
    }
  };

  // Shopping list functions
  const saveBoodschappen = async () => {
    try {
      await setDoc(doc(db, 'families', familyId, 'boodschappen', 'current'), {
        extraBoodschappen,
        verwijderdeBoodschappen,
        afgevinkteBoodschappen,
        vaakGekocht,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving boodschappen:', error);
    }
  };

  useEffect(() => {
    if (familyId && !loading) {
      const timer = setTimeout(() => {
        saveBoodschappen();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [extraBoodschappen, verwijderdeBoodschappen, afgevinkteBoodschappen, vaakGekocht]);

  const addExtraBoodschap = () => {
    if (!nieuweBoodschap.naam.trim()) {
      alert('Voer een naam in voor de boodschap');
      return;
    }

    const newItem = {
      id: Date.now(),
      naam: nieuweBoodschap.naam,
      hoeveelheid: '',
      eenheid: '',
      categorie: nieuweBoodschap.categorie,
      winkel: nieuweBoodschap.winkel
    };

    setExtraBoodschappen([...extraBoodschappen, newItem]);
    
    const itemKey = `${nieuweBoodschap.naam}-${nieuweBoodschap.categorie}`;
    if (!vaakGekocht.find(item => `${item.naam}-${item.categorie}` === itemKey)) {
      setVaakGekocht([...vaakGekocht, {
        naam: nieuweBoodschap.naam,
        categorie: nieuweBoodschap.categorie,
        winkel: nieuweBoodschap.winkel
      }]);
    }
    
    setNieuweBoodschap({ naam: '', categorie: 'Overig', winkel: 'Appie' });
    setShowAddBoodschap(false);
    setCustomInput(false);
  };

  const addFromPreset = (preset) => {
    const newItem = {
      id: Date.now(),
      naam: preset.naam,
      hoeveelheid: '',
      eenheid: '',
      categorie: preset.categorie,
      winkel: preset.winkel
    };
    setExtraBoodschappen([...extraBoodschappen, newItem]);
    setShowAddBoodschap(false);
  };

  const verwijderBoodschap = (key) => {
    setVerwijderdeBoodschappen([...verwijderdeBoodschappen, key]);
  };

  const herstelBoodschap = (key) => {
    setVerwijderdeBoodschappen(verwijderdeBoodschappen.filter(k => k !== key));
  };

  const toggleAfvinken = (key) => {
    if (afgevinkteBoodschappen.includes(key)) {
      setAfgevinkteBoodschappen(afgevinkteBoodschappen.filter(k => k !== key));
    } else {
      setAfgevinkteBoodschappen([...afgevinkteBoodschappen, key]);
    }
  };

  const verwijderExtraItem = (id) => {
    setExtraBoodschappen(extraBoodschappen.filter(item => item.id !== id));
  };

  const updateExtraBoodschap = (id, field, value) => {
    setExtraBoodschappen(extraBoodschappen.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const resetBoodschappenlijst = () => {
    if (window.confirm('Wil je de boodschappenlijst resetten?')) {
      setExtraBoodschappen([]);
      setVerwijderdeBoodschappen([]);
      setAfgevinkteBoodschappen([]);
    }
  };

  const generateBoodschappenlijst = () => {
    const lijst = {};
    
    Object.entries(weekMenu).forEach(([dag, dagData]) => {
      if (!dagData || !dagData.maaltijden) return;
      
      dagData.maaltijden.forEach(maaltijd => {
        if (!maaltijd.gerechtId) return;
        
        const gerecht = gerechten.find(g => g.id === maaltijd.gerechtId);
        if (!gerecht) return;
        
        const aantalPersonen = maaltijd.aantalPersonen || 1;
        
        gerecht.ingredienten.forEach(ingredient => {
          const key = `${ingredient.naam}-${ingredient.eenheid}`;
          const totaal = ingredient.hoeveelheid * aantalPersonen;
          const categorie = getCategorieVoorIngredient(ingredient.naam);
          const winkel = ingredient.winkel || getWinkelVoorIngredient(ingredient.naam);
          
          if (lijst[key]) {
            lijst[key].hoeveelheid += totaal;
          } else {
            lijst[key] = {
              naam: ingredient.naam,
              hoeveelheid: totaal,
              eenheid: ingredient.eenheid,
              categorie: categorie,
              winkel: winkel,
              bron: 'weekmenu'
            };
          }
        });
      });
    });

    extraBoodschappen.forEach(item => {
      const key = `${item.naam}-extra-${item.id}`;
      lijst[key] = {
        naam: item.naam,
        hoeveelheid: item.hoeveelheid || '',
        eenheid: item.eenheid || '',
        categorie: item.categorie,
        winkel: item.winkel || 'Appie',
        bron: 'extra',
        id: item.id
      };
    });

    const filtered = Object.entries(lijst)
      .filter(([key]) => !verwijderdeBoodschappen.includes(key))
      .map(([key, item]) => ({ ...item, key }));

    const groupedByCategory = {};
    categorieën.forEach(cat => {
      groupedByCategory[cat] = filtered.filter(item => item.categorie === cat);
    });

    const groupedByShop = {};
    winkels.forEach(winkel => {
      groupedByShop[winkel] = {};
      categorieën.forEach(cat => {
        const items = filtered.filter(item => item.winkel === winkel && item.categorie === cat);
        if (items.length > 0) {
          groupedByShop[winkel][cat] = items;
        }
      });
    });

    return { byCategory: groupedByCategory, byShop: groupedByShop };
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Weekmenu laden...</p>
        </div>
      </div>
    );
  }

  const renderMenuTab = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <Calendar className="text-blue-600" />
        Weekmenu Planning
      </h2>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Realtime sync:</strong> Wijzigingen worden direct gesynchroniseerd tussen alle apparaten!
        </p>
      </div>
      
      <div className="space-y-5">
        {dagen.map(dag => (
          <div key={dag} className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">{dag}</h3>
              <button
                onClick={() => addMaaltijd(dag)}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 font-medium"
              >
                <Plus size={16} />
                Extra gerecht
              </button>
            </div>
            
            <div className="space-y-3">
              {weekMenu[dag]?.maaltijden?.map((maaltijd, index) => (
                <div key={index} className="flex gap-3 items-center bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <select
                      value={maaltijd.gerechtId || ''}
                      onChange={(e) => updateMaaltijd(dag, index, 'gerechtId', e.target.value || null)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Kies een gerecht --</option>
                      {gerechten.map(gerecht => (
                        <option key={gerecht.id} value={gerecht.id}>
                          {gerecht.naam} ({gerecht.bereidingstijd} min)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-300">
                    <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Personen:</label>
                    <select
                      value={maaltijd.aantalPersonen || 1}
                      onChange={(e) => updateMaaltijd(dag, index, 'aantalPersonen', parseInt(e.target.value))}
                      className="border-0 focus:ring-0 p-0 pr-6 text-sm font-semibold text-gray-800"
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300">
                    <input
                      type="time"
                      value={maaltijd.tijd || '18:00'}
                      onChange={(e) => updateMaaltijd(dag, index, 'tijd', e.target.value)}
                      className="border-0 focus:ring-0 p-0 text-sm w-20"
                    />
                  </div>
                  
                  {weekMenu[dag]?.maaltijden?.length > 1 && (
                    <button
                      onClick={() => removeMaaltijd(dag, index)}
                      className="text-red-500 hover:text-red-700 p-2"
                      title="Verwijder gerecht"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGerechtenTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ChefHat className="text-blue-600" />
          Gerechten Bibliotheek
        </h2>
        <button
          onClick={() => setShowAddGerecht(!showAddGerecht)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Nieuw Gerecht
        </button>
      </div>

      {showAddGerecht && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Nieuw Gerecht Toevoegen</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naam Gerecht</label>
              <input
                type="text"
                value={nieuwGerecht.naam}
                onChange={(e) => setNieuwGerecht({ ...nieuwGerecht, naam: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Bijv. Lasagne"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bereidingstijd (minuten)</label>
              <input
                type="number"
                value={nieuwGerecht.bereidingstijd}
                onChange={(e) => setNieuwGerecht({ ...nieuwGerecht, bereidingstijd: parseInt(e.target.value) })}
                className="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Ingrediënten (per persoon)</label>
                <button
                  onClick={addIngredientField}
                  className="text-blue-600 text-sm flex items-center gap-1 hover:text-blue-700"
                  type="button"
                >
                  <Plus size={16} />
                  Ingredient
                </button>
              </div>
              
              <div className="space-y-2">
                {nieuwGerecht.ingredienten.map((ing, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={ing.naam}
                      onChange={(e) => updateIngredient(index, 'naam', e.target.value)}
                      placeholder="Ingredient"
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={ing.hoeveelheid}
                      onChange={(e) => updateIngredient(index, 'hoeveelheid', parseFloat(e.target.value))}
                      placeholder="Aantal"
                      className="w-20 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={ing.eenheid}
                      onChange={(e) => updateIngredient(index, 'eenheid', e.target.value)}
                      className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {eenheden.map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                    <select
                      value={ing.winkel || 'Appie'}
                      onChange={(e) => updateIngredient(index, 'winkel', e.target.value)}
                      className="w-28 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {winkels.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                    {nieuwGerecht.ingredienten.length > 1 && (
                      <button
                        onClick={() => removeIngredient(index)}
                        className="text-red-500 hover:text-red-700"
                        type="button"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={saveGerecht}
                type="button"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Opslaan
              </button>
              <button
                onClick={() => setShowAddGerecht(false)}
                type="button"
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {gerechten.map(gerecht => {
          const isEditing = editingGerechtId === gerecht.id;
          
          return (
            <div key={gerecht.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={gerecht.naam}
                        onChange={(e) => updateGerecht(gerecht.id, 'naam', e.target.value)}
                        className="font-semibold text-lg text-gray-800 w-full p-1 border border-gray-300 rounded"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={gerecht.bereidingstijd}
                          onChange={(e) => updateGerecht(gerecht.id, 'bereidingstijd', parseInt(e.target.value))}
                          className="w-16 p-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-sm text-gray-500">minuten</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-semibold text-lg text-gray-800">{gerecht.naam}</h3>
                      <p className="text-sm text-gray-500">{gerecht.bereidingstijd} minuten</p>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <button
                      onClick={() => setEditingGerechtId(null)}
                      className="text-green-600 hover:text-green-700 font-medium text-sm"
                    >
                      Klaar
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingGerechtId(gerecht.id)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      Bewerk
                    </button>
                  )}
                  <button
                    onClick={() => deleteGerecht(gerecht.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="text-sm">
                <p className="font-medium text-gray-700 mb-2">Ingrediënten (per persoon):</p>
                <div className="space-y-2">
                  {gerecht.ingredienten?.map((ing, idx) => (
                    <div key={idx}>
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={ing.naam}
                            onChange={(e) => updateGerechtIngredient(gerecht.id, idx, 'naam', e.target.value)}
                            placeholder="Ingredient"
                            className="flex-1 p-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            value={ing.hoeveelheid}
                            onChange={(e) => updateGerechtIngredient(gerecht.id, idx, 'hoeveelheid', parseFloat(e.target.value))}
                            className="w-16 p-1 border border-gray-300 rounded text-sm"
                          />
                          <select
                            value={ing.eenheid}
                            onChange={(e) => updateGerechtIngredient(gerecht.id, idx, 'eenheid', e.target.value)}
                            className="w-20 p-1 border border-gray-300 rounded text-sm"
                          >
                            {eenheden.map(e => (
                              <option key={e} value={e}>{e}</option>
                            ))}
                          </select>
                          <select
                            value={ing.winkel || 'Appie'}
                            onChange={(e) => updateGerechtIngredient(gerecht.id, idx, 'winkel', e.target.value)}
                            className="w-24 p-1 border border-gray-300 rounded text-sm"
                          >
                            {winkels.map(w => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                          </select>
                          {gerecht.ingredienten.length > 1 && (
                            <button
                              onClick={() => removeIngredientFromGerecht(gerecht.id, idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-600">
                          • {ing.naam}: {ing.hoeveelheid} {ing.eenheid}
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {ing.winkel || 'Appie'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <button
                      onClick={() => addIngredientToGerecht(gerecht.id)}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 mt-2"
                    >
                      <Plus size={16} />
                      Ingredient toevoegen
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderBoodschappenTab = () => {
    const { byCategory, byShop } = generateBoodschappenlijst();
    const gegroepeerd = boodschappenWeergave === 'categorie' ? byCategory : byShop;
    
    const totaalItems = boodschappenWeergave === 'categorie' 
      ? Object.values(gegroepeerd).flat().length
      : Object.values(gegroepeerd).flatMap(shop => Object.values(shop).flat()).length;
    
    const afgevinkt = boodschappenWeergave === 'categorie'
      ? Object.values(gegroepeerd).flat().filter(item => afgevinkteBoodschappen.includes(item.key)).length
      : Object.values(gegroepeerd).flatMap(shop => Object.values(shop).flat()).filter(item => afgevinkteBoodschappen.includes(item.key)).length;
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart className="text-blue-600" />
            Boodschappenlijst
          </h2>
          
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setBoodschappenWeergave('categorie')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition ${
                boodschappenWeergave === 'categorie'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Per Categorie
            </button>
            <button
              onClick={() => setBoodschappenWeergave('winkel')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition ${
                boodschappenWeergave === 'winkel'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Per Winkel
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddBoodschap(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-2"
            >
              <Plus size={18} />
              Extra item
            </button>
            <button
              onClick={resetBoodschappenlijst}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition text-sm"
            >
              Reset lijst
            </button>
          </div>
        </div>

        {totaalItems === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">Plan eerst je weekmenu om een boodschappenlijst te genereren.</p>
          </div>
        ) : (
          <>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Voortgang</span>
                <span className="text-sm font-semibold text-blue-600">{afgevinkt} / {totaalItems}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totaalItems > 0 ? (afgevinkt / totaalItems) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {showAddBoodschap && (
              <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">Extra Boodschap Toevoegen</h3>
                  <button
                    onClick={() => {
                      setShowAddBoodschap(false);
                      setCustomInput(false);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                {!customInput ? (
                  <>
                    {vaakGekocht.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">💚 Vaak gekocht:</h4>
                        <div className="flex flex-wrap gap-2">
                          {vaakGekocht.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => addFromPreset(item)}
                              className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition text-sm text-gray-700"
                            >
                              {item.naam}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">💡 Suggesties:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {voorgesteldeItems.map((preset, idx) => (
                          <button
                            key={idx}
                            onClick={() => addFromPreset(preset)}
                            className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-sm text-left text-gray-700"
                          >
                            {preset.naam}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setCustomInput(true)}
                      className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition"
                    >
                      + Aangepast item toevoegen
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-3 flex-wrap">
                      <input
                        type="text"
                        value={nieuweBoodschap.naam}
                        onChange={(e) => setNieuweBoodschap({ ...nieuweBoodschap, naam: e.target.value })}
                        placeholder="bijv. Fruit, Cola, Boter..."
                        className="flex-1 min-w-[200px] p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <select
                        value={nieuweBoodschap.categorie}
                        onChange={(e) => setNieuweBoodschap({ ...nieuweBoodschap, categorie: e.target.value })}
                        className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {categorieën.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <select
                        value={nieuweBoodschap.winkel}
                        onChange={(e) => setNieuweBoodschap({ ...nieuweBoodschap, winkel: e.target.value })}
                        className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {winkels.map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addExtraBoodschap}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                      >
                        Toevoegen
                      </button>
                      <button
                        onClick={() => setCustomInput(false)}
                        className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
                      >
                        Terug
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              {boodschappenWeergave === 'categorie' ? (
                categorieën.map(categorie => {
                  const items = gegroepeerd[categorie] || [];
                  if (items.length === 0) return null;

                  return (
                    <div key={categorie} className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
                      <h3 className="font-bold text-lg text-gray-800 mb-3 pb-2 border-b border-gray-200">
                        {categorie}
                      </h3>
                      <div className="space-y-2">
                        {items.map((item) => {
                          const isChecked = afgevinkteBoodschappen.includes(item.key);
                          const isEditingThis = editingBoodschapKey === item.key && item.bron === 'extra';
                          
                          return (
                            <div 
                              key={item.key} 
                              className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition ${
                                isChecked ? 'opacity-50' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleAfvinken(item.key)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              />
                              
                              {isEditingThis ? (
                                <>
                                  <input
                                    type="text"
                                    value={item.naam}
                                    onChange={(e) => updateExtraBoodschap(item.id, 'naam', e.target.value)}
                                    className="flex-1 p-1 border border-gray-300 rounded text-sm"
                                  />
                                  <button
                                    onClick={() => setEditingBoodschapKey(null)}
                                    className="text-green-600 hover:text-green-700 text-xs px-2"
                                  >
                                    ✓
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className={`flex-1 ${isChecked ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                    {item.naam}
                                    {item.hoeveelheid && (
                                      <span className="ml-2 text-gray-600 font-medium">
                                        {Math.round(item.hoeveelheid)} {item.eenheid}
                                      </span>
                                    )}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    item.winkel === 'Visboer' ? 'bg-blue-100 text-blue-700' :
                                    item.winkel === 'Slager' ? 'bg-red-100 text-red-700' :
                                    item.winkel === 'Netto' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {item.winkel || 'Appie'}
                                  </span>
                                </>
                              )}
                              
                              {item.bron === 'extra' && !isEditingThis && (
                                <>
                                  <button
                                    onClick={() => setEditingBoodschapKey(item.key)}
                                    className="text-blue-500 hover:text-blue-700 text-xs px-2"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    onClick={() => verwijderExtraItem(item.id)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                              {item.bron === 'weekmenu' && !isEditingThis && (
                                <button
                                  onClick={() => verwijderBoodschap(item.key)}
                                  className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded"
                                >
                                  Heb ik al
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                winkels.map(winkel => {
                  const shopCategories = gegroepeerd[winkel] || {};
                  const hasItems = Object.values(shopCategories).some(items => items.length > 0);
                  if (!hasItems) return null;

                  return (
                    <div key={winkel} className="bg-white p-5 rounded-lg shadow-md border-2 border-gray-300">
                      <h2 className={`font-bold text-xl mb-4 pb-3 border-b-2 ${
                        winkel === 'Visboer' ? 'text-blue-700 border-blue-200' :
                        winkel === 'Slager' ? 'text-red-700 border-red-200' :
                        winkel === 'Netto' ? 'text-yellow-700 border-yellow-200' :
                        winkel === 'Appie' ? 'text-green-700 border-green-200' :
                        'text-gray-700 border-gray-200'
                      }`}>
                        🏪 {winkel}
                      </h2>
                      
                      <div className="space-y-4">
                        {Object.entries(shopCategories).map(([categorie, items]) => (
                          <div key={categorie}>
                            <h4 className="font-semibold text-sm text-gray-600 mb-2 uppercase">
                              {categorie}
                            </h4>
                            <div className="space-y-2 ml-2">
                              {items.map((item) => {
                                const isChecked = afgevinkteBoodschappen.includes(item.key);
                                
                                return (
                                  <div 
                                    key={item.key} 
                                    className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition ${
                                      isChecked ? 'opacity-50' : ''
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleAfvinken(item.key)}
                                      className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                                    />
                                    <span className={`flex-1 ${isChecked ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                      {item.naam}
                                      {item.hoeveelheid && (
                                        <span className="ml-2 text-gray-600 font-medium">
                                          {Math.round(item.hoeveelheid)} {item.eenheid}
                                        </span>
                                      )}
                                    </span>
                                    {item.bron === 'weekmenu' && (
                                      <button
                                        onClick={() => verwijderBoodschap(item.key)}
                                        className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded"
                                      >
                                        Heb ik al
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">🍽️ Weekmenu Planner</h1>
              <p className="text-gray-600">Realtime gesynchroniseerd tussen alle apparaten</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition"
            >
              <LogOut size={16} />
              Uitloggen
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex-1 py-4 px-6 font-medium transition ${
                activeTab === 'menu'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Calendar className="inline mr-2" size={20} />
              Weekmenu
            </button>
            <button
              onClick={() => setActiveTab('gerechten')}
              className={`flex-1 py-4 px-6 font-medium transition ${
                activeTab === 'gerechten'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <ChefHat className="inline mr-2" size={20} />
              Gerechten
            </button>
            <button
              onClick={() => setActiveTab('boodschappen')}
              className={`flex-1 py-4 px-6 font-medium transition ${
                activeTab === 'boodschappen'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <ShoppingCart className="inline mr-2" size={20} />
              Boodschappen
            </button>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg shadow-lg p-6">
          {activeTab === 'menu' && renderMenuTab()}
          {activeTab === 'gerechten' && renderGerechtenTab()}
          {activeTab === 'boodschappen' && renderBoodschappenTab()}
        </div>
      </div>
    </div>
  );
};

export default WeekMenuPlanner;
