import Header from "@/components/layout/Header/Header";
import './Home.css';

export default function HomeScreen() {
	return (
		<div className="page-home">
			<Header />
			<main className="page-home__main">
				<h2 className="home-heading">Bem-vindo ao Telemedicina</h2>
			</main>
		</div>
	);
}