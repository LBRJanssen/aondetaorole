'use client';

import Link from 'next/link';
import { MapPin, Instagram, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark-950 border-t border-dark-700 mt-auto">
      <div className="container-app py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo e descricao */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-neon-pink to-neon-purple rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-white text-lg">R</span>
              </div>
              <span className="font-display font-bold text-xl">
                AONDE TA O <span className="text-neon-pink">ROLE</span>
              </span>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">
              Descubra festas e eventos perto de voce em tempo real. 
              Conecte-se com a galera e nunca mais perca um role.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-gray-400 hover:bg-neon-pink hover:text-white transition-all"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="mailto:contato@aondetaorole.com"
                className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-gray-400 hover:bg-neon-pink hover:text-white transition-all"
                aria-label="Email"
              >
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Links rapidos */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/home" className="text-gray-400 hover:text-neon-pink transition-colors">
                  Mapa de Festas
                </Link>
              </li>
              <li>
                <Link href="/festas" className="text-gray-400 hover:text-neon-pink transition-colors">
                  Lista de Festas
                </Link>
              </li>
              <li>
                <Link href="/cadastro-festa" className="text-gray-400 hover:text-neon-pink transition-colors">
                  Cadastrar Festa
                </Link>
              </li>
              <li>
                <Link href="/premium" className="text-gray-400 hover:text-neon-pink transition-colors">
                  Plano Premium
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/termos" className="text-gray-400 hover:text-neon-pink transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/termos#privacidade" className="text-gray-400 hover:text-neon-pink transition-colors">
                  Privacidade
                </Link>
              </li>
              <li>
                <Link href="/termos#cookies" className="text-gray-400 hover:text-neon-pink transition-colors">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Linha divisoria */}
        <div className="border-t border-dark-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              {currentYear} Aonde Ta o Role. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <MapPin size={16} />
              <span>Sao Paulo, Brasil</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

