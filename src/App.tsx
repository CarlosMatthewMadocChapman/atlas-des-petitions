import { Component, type ReactNode } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorState, Loading } from './components/States';
import { DataProvider, useCoreState, useRetry } from './state/DataContext';
import { CompareView } from './views/Compare';
import { ConstellationDetail, ConstellationsIndex } from './views/Constellations';
import { Explore } from './views/Explore';
import { FavoritesView } from './views/Favorites';
import { Home } from './views/Home';
import { Invisibles } from './views/Invisibles';
import { Method } from './views/Method';
import { NotFound } from './views/NotFound';
import { PetitionView } from './views/Petition';
import { Write } from './views/Write';

function Gate({ children }: { children: ReactNode }) {
  const state = useCoreState();
  const retry = useRetry();
  if (state.status === 'loading') {
    return (
      <div className="container page">
        <Loading />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="container page">
        <ErrorState title="Le catalogue n'a pas pu être chargé" error={state.error} onRetry={retry} />
      </div>
    );
  }
  return <>{children}</>;
}

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="container page">
          <ErrorState title="Une erreur d'affichage est survenue" error={this.state.error} onRetry={() => this.setState({ error: null })} />
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Boundary>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Gate><Home /></Gate>} />
              <Route path="recherche" element={<Gate><Explore /></Gate>} />
              <Route path="petition/:id" element={<Gate><PetitionView /></Gate>} />
              <Route path="constellations" element={<Gate><ConstellationsIndex /></Gate>} />
              <Route path="constellations/:id" element={<Gate><ConstellationDetail /></Gate>} />
              <Route path="comparer" element={<Gate><CompareView /></Gate>} />
              <Route path="invisibles" element={<Gate><Invisibles /></Gate>} />
              <Route path="ecrire" element={<Gate><Write /></Gate>} />
              <Route path="favoris" element={<Gate><FavoritesView /></Gate>} />
              <Route path="methode" element={<Gate><Method /></Gate>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Boundary>
      </HashRouter>
    </DataProvider>
  );
}
