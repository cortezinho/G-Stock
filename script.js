(() => {
    'use strict';

    const DEFAULT_PRODUCTS = [
        { id: '1', model: 'IDAC-35', identification: '142', serialNumber: '3926-62848' },
        { id: '2', model: 'ICAL-200', identification: '96', serialNumber: '3926-62859' },
        { id: '3', model: 'ITEG-2000B', identification: '09', serialNumber: '4924-61215' },
        { id: '4', model: 'ITEG-2000', identification: '40', serialNumber: '4825-62178' }
    ];

    let products = JSON.parse(localStorage.getItem('products_db')) || DEFAULT_PRODUCTS;
    let sales = JSON.parse(localStorage.getItem('sales_db')) || [];
    let currentCart = [];
    let pendingAction = null;

    // --- ELEMENTOS DA DOM ---
    const elements = {
        tabs: document.querySelectorAll('.tab-content'),
        tabBtns: document.querySelectorAll('.tab-btn'),
        
        // Estoque
        searchProduct: document.getElementById('search-product'),
        productsTableBody: document.getElementById('products-table-body'),
        emptyProducts: document.getElementById('empty-products'),
        stockCounter: document.getElementById('stock-counter'),
        btnOpenModalAdd: document.getElementById('btn-open-modal-add'),

        // Modal Produto
        productModal: document.getElementById('product-modal'),
        formProduct: document.getElementById('form-product'),
        modalTitle: document.getElementById('modal-title'),
        productId: document.getElementById('product-id'),
        productModel: document.getElementById('product-model'),
        productIdentification: document.getElementById('product-identification'),
        productSerial: document.getElementById('product-serial'),
        btnCloseModal: document.getElementById('btn-close-modal'),
        btnCancelModal: document.getElementById('btn-cancel-modal'),

        // Vendas
        searchSaleProduct: document.getElementById('search-sale-product'),
        saleProductsTable: document.getElementById('sale-products-table'),
        saleProductsTableBody: document.getElementById('sale-products-table-body'),
        emptySaleProducts: document.getElementById('empty-sale-products'),
        saleClientName: document.getElementById('sale-client-name'),
        saleOpNumber: document.getElementById('sale-op-number'),
        cartItems: document.getElementById('cart-items'),
        cartEmptyState: document.getElementById('cart-empty-state'),
        cartTotalItems: document.getElementById('cart-total-items'),
        btnCheckout: document.getElementById('btn-checkout'),
        btnClearCart: document.getElementById('btn-clear-cart'),

        // Histórico
        searchHistory: document.getElementById('search-history'),
        salesHistoryTableBody: document.getElementById('sales-history-table-body'),
        emptyHistory: document.getElementById('empty-history'),
        salesHistoryCount: document.getElementById('sales-history-count'),

        // Backup/Import
        btnExport: document.getElementById('btn-export'),
        importFile: document.getElementById('import-file'),
        btnExportMobile: document.getElementById('btn-export-mobile'),
        importFileMobile: document.getElementById('import-file-mobile'),

        // Modal Confirmação
        confirmModal: document.getElementById('confirm-modal'),
        confirmModalTitle: document.getElementById('confirm-modal-title'),
        confirmModalMsg: document.getElementById('confirm-modal-msg'),
        btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
        btnConfirmOk: document.getElementById('btn-confirm-ok'),

        // Toast
        toastContainer: document.getElementById('toast-container')
    };

    // --- AUXILIARES E UTILITÁRIOS ---
    const sanitize = (str) => {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    };

    const showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-circle-exclamation' : 'fa-info-circle';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${sanitize(message)}</span>`;
        
        elements.toastContainer.appendChild(toast);
        
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    const confirmAction = (title, message, onConfirm) => {
        elements.confirmModalTitle.textContent = title;
        elements.confirmModalMsg.textContent = message;
        pendingAction = onConfirm;
        elements.confirmModal.classList.remove('hidden');
    };

    const closeConfirmModal = () => {
        elements.confirmModal.classList.add('hidden');
        pendingAction = null;
    };

    const saveToStorage = () => {
        localStorage.setItem('products_db', JSON.stringify(products));
        localStorage.setItem('sales_db', JSON.stringify(sales));
    };

    // --- NAVEGAÇÃO ENTRE ABAS ---
    const switchTab = (tabName) => {
        elements.tabs.forEach(el => el.classList.add('hidden'));
        elements.tabBtns.forEach(btn => btn.classList.remove('active'));

        const activeContent = document.getElementById(`tab-${tabName}`);
        const activeBtn = document.getElementById(`btn-tab-${tabName}`);

        if (activeContent && activeBtn) {
            activeContent.classList.remove('hidden');
            activeBtn.classList.add('active');
        }

        if (tabName === 'vendas') renderSaleProducts();
        if (tabName === 'historico') renderSalesHistory();
    };

    // --- MÓDULO DE ESTOQUE ---
    const renderProducts = () => {
        const query = (elements.searchProduct.value || '').toLowerCase().trim();
        const filtered = products.filter(p => 
            p.model.toLowerCase().includes(query) ||
            p.identification.toLowerCase().includes(query) ||
            p.serialNumber.toLowerCase().includes(query)
        );

        elements.productsTableBody.innerHTML = '';

        if (filtered.length === 0) {
            elements.emptyProducts.classList.remove('hidden');
            elements.productsTableBody.parentElement.classList.add('hidden');
        } else {
            elements.emptyProducts.classList.add('hidden');
            elements.productsTableBody.parentElement.classList.remove('hidden');
            const fragment = document.createDocumentFragment();

            filtered.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="item-model text-center">${sanitize(p.model)}</td>
                    <td class="item-id text-center">${sanitize(p.identification)}</td>
                    <td class="item-id text-center">${sanitize(p.serialNumber)}</td>
                    <td class="text-center">
                        <button type="button" data-action="edit" data-id="${p.id}" class="btn-icon text-primary" title="Editar Item">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button type="button" data-action="delete" data-id="${p.id}" class="btn-icon text-danger" title="Remover do Estoque">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                `;
                fragment.appendChild(tr);
            });

            elements.productsTableBody.appendChild(fragment);
        }

        elements.stockCounter.textContent = `Total em estoque: ${products.length} itens`;
    };

    const openProductModal = (productId = null) => {
        elements.formProduct.reset();
        elements.productId.value = '';

        if (productId) {
            const prod = products.find(p => String(p.id) === String(productId));
            if (prod) {
                elements.productId.value = prod.id;
                elements.productModel.value = prod.model;
                elements.productIdentification.value = prod.identification;
                elements.productSerial.value = prod.serialNumber;
                elements.modalTitle.textContent = "Editar Item do Estoque";
            }
        } else {
            elements.modalTitle.textContent = "Cadastrar Novo Item";
        }

        elements.productModal.classList.remove('hidden');
    };

    const closeProductModal = () => {
        elements.productModal.classList.add('hidden');
    };

    const handleProductFormSubmit = (e) => {
        e.preventDefault();
        
        const id = elements.productId.value;
        const model = elements.productModel.value.trim();
        const identification = elements.productIdentification.value.trim();
        const serialNumber = elements.productSerial.value.trim();

        if (!model || !identification || !serialNumber) {
            showToast("Por favor, preencha todos os campos obrigatórios.", "error");
            return;
        }

        const duplicate = products.find(p => 
            p.serialNumber.toLowerCase() === serialNumber.toLowerCase() && String(p.id) !== String(id)
        );

        if (duplicate) {
            showToast(`O Nº de Série '${serialNumber}' já pertence a outro equipamento no estoque.`, "error");
            return;
        }

        if (id) {
            const index = products.findIndex(p => String(p.id) === String(id));
            if (index !== -1) {
                products[index] = { id, model, identification, serialNumber };
                showToast("Item atualizado com sucesso!", "success");
            }
        } else {
            products.push({
                id: Date.now().toString(),
                model,
                identification,
                serialNumber
            });
            showToast("Item cadastrado com sucesso!", "success");
        }

        saveToStorage();
        renderProducts();
        renderSaleProducts();
        closeProductModal();
    };

    const deleteProduct = (id) => {
        confirmAction("Remover Item", "Deseja realmente remover este item do estoque?", () => {
            products = products.filter(p => String(p.id) !== String(id));
            saveToStorage();
            renderProducts();
            renderSaleProducts();
            showToast("Item removido do estoque.", "info");
        });
    };

    // --- MÓDULO DE VENDAS & CARRINHO ---
    const renderSaleProducts = () => {
        const query = (elements.searchSaleProduct.value || '').toLowerCase().trim();
        const filtered = products.filter(p => 
            p.model.toLowerCase().includes(query) ||
            p.identification.toLowerCase().includes(query) ||
            p.serialNumber.toLowerCase().includes(query)
        );

        elements.saleProductsTableBody.innerHTML = '';
        
        if (filtered.length === 0) {
            elements.emptySaleProducts.classList.remove('hidden');
            elements.saleProductsTable.classList.add('hidden');
        } else {
            elements.emptySaleProducts.classList.add('hidden');
            elements.saleProductsTable.classList.remove('hidden');

            const fragment = document.createDocumentFragment();

            filtered.forEach(p => {
                const inCart = currentCart.some(item => String(item.id) === String(p.id));
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="item-model text-center">${sanitize(p.model)}</td>
                    <td class="item-id text-center">${sanitize(p.identification)}</td>
                    <td class="item-id text-center">${sanitize(p.serialNumber)}</td>
                    <td class="text-center">
                        <button type="button" data-action="add-cart" data-id="${p.id}" ${inCart ? 'disabled' : ''} class="btn btn-primary btn-small mx-auto">
                            <i class="fa-solid ${inCart ? 'fa-check' : 'fa-plus'}"></i>
                            <span>${inCart ? 'Selecionado' : 'Selecionar'}</span>
                        </button>
                    </td>
                `;
                fragment.appendChild(tr);
            });

            elements.saleProductsTableBody.appendChild(fragment);
        }
    };

    const addToCart = (productId) => {
        const prod = products.find(p => String(p.id) === String(productId));
        if (!prod) return;

        if (!currentCart.some(item => String(item.id) === String(productId))) {
            currentCart.push({ ...prod });
        }

        renderCart();
        renderSaleProducts();
    };

    const removeFromCart = (productId) => {
        currentCart = currentCart.filter(item => String(item.id) !== String(productId));
        renderCart();
        renderSaleProducts();
    };

    const clearCart = () => {
        currentCart = [];
        elements.saleClientName.value = '';
        elements.saleOpNumber.value = '';
        renderCart();
        renderSaleProducts();
    };

    const renderCart = () => {
        elements.cartItems.innerHTML = '';

        if (currentCart.length === 0) {
            elements.cartEmptyState.classList.remove('hidden');
            elements.btnCheckout.disabled = true;
        } else {
            elements.cartEmptyState.classList.add('hidden');
            elements.btnCheckout.disabled = false;

            const fragment = document.createDocumentFragment();
            currentCart.forEach(item => {
                const div = document.createElement('div');
                div.className = "cart-item";
                div.innerHTML = `
                    <div class="cart-item-details">
                        <p class="model">${sanitize(item.model)}</p>
                        <p>${sanitize(item.identification)}</p>
                        <p>N/S: ${sanitize(item.serialNumber)}</p>
                    </div>
                    <button type="button" data-action="remove-cart" data-id="${item.id}" class="btn-icon text-danger" title="Remover seleção">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                `;
                fragment.appendChild(div);
            });
            elements.cartItems.appendChild(fragment);
        }

        elements.cartTotalItems.textContent = currentCart.length;
    };

    const checkoutSale = () => {
        const clientName = elements.saleClientName.value.trim();
        const opNumber = elements.saleOpNumber.value.trim();

        if (currentCart.length === 0) {
            showToast("Selecione pelo menos um equipamento para a venda.", "error");
            return;
        }
        if (!clientName) {
            showToast("Por favor, informe o Nome do Cliente.", "error");
            elements.saleClientName.focus();
            return;
        }
        if (!opNumber) {
            showToast("Por favor, informe o Nº da Ordem de Produção (OP).", "error");
            elements.saleOpNumber.focus();
            return;
        }

        const soldIds = currentCart.map(item => String(item.id));
        products = products.filter(p => !soldIds.includes(String(p.id)));

        const newSale = {
            id: 'VENDA-' + Date.now().toString().slice(-6),
            date: new Date().toLocaleString('pt-BR'),
            clientName,
            opNumber,
            items: [...currentCart]
        };

        sales.unshift(newSale);

        saveToStorage();
        clearCart();
        renderProducts();

        showToast(`Venda registrada com sucesso para '${clientName}'!`, "success");
        switchTab('historico');
    };

    // --- MÓDULO DE HISTÓRICO ---
    const renderSalesHistory = () => {
        const query = (elements.searchHistory.value || '').toLowerCase().trim();
        const filteredSales = sales.filter(s => 
            (s.clientName || '').toLowerCase().includes(query) ||
            (s.opNumber || '').toLowerCase().includes(query) ||
            (s.id || '').toLowerCase().includes(query)
        );

        elements.salesHistoryTableBody.innerHTML = '';
        elements.salesHistoryCount.textContent = `${filteredSales.length} vendas`;

        if (filteredSales.length === 0) {
            elements.emptyHistory.classList.remove('hidden');
            elements.salesHistoryTableBody.parentElement.classList.add('hidden');
        } else {
            elements.emptyHistory.classList.add('hidden');
            elements.salesHistoryTableBody.parentElement.classList.remove('hidden');
            const fragment = document.createDocumentFragment();

            filteredSales.forEach(sale => {
                const tr = document.createElement('tr');
                const itemsFormatted = sale.items.map(i => `
                    <div style="padding: 4px 0">
                        <strong style="color: var(--primary-dark)">${sanitize(i.model)}</strong> 
                        <strong>(${sanitize(i.identification)})</strong> - 
                        <span>N/S: ${sanitize(i.serialNumber)}</span>
                    </div>
                `).join('');

                tr.innerHTML = `
                    <td class="text-center">
                        <div style="font-family: monospace; font-weight: bold; color: var(--primary)">${sanitize(sale.id)}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">${sanitize(sale.date)}</div>
                    </td>
                    <td class="text-center" style="font-weight: 600;">${sanitize(sale.clientName || 'N/A')}</td>
                    <td class="text-center">
                        <span class="badge" style="color: var(--primary-dark); background: var(--primary-light); border-color: rgba(0,0,0,0.1)">
                            ${sanitize(sale.opNumber || 'N/A')}
                        </span>
                    </td>
                    <td>${itemsFormatted}</td>
                    <td class="text-center">
                        <button type="button" data-action="cancel-sale" data-id="${sale.id}" title="Estornar Venda" class="btn btn-outline btn-small" style="color: var(--danger); border-color: var(--danger-light);">
                            <i class="fa-solid fa-rotate-left"></i><span>Estornar</span>
                        </button>
                    </td>
                `;
                fragment.appendChild(tr);
            });

            elements.salesHistoryTableBody.appendChild(fragment);
        }
    };

    const cancelSale = (saleId) => {
        confirmAction("Estornar Venda", "Deseja estornar esta venda? Os equipamentos retornarão imediatamente ao estoque.", () => {
            const saleIndex = sales.findIndex(s => s.id === saleId);
            if (saleIndex === -1) return;

            const sale = sales[saleIndex];
            sale.items.forEach(item => {
                if (!products.some(p => String(p.id) === String(item.id))) {
                    products.push(item);
                }
            });

            sales.splice(saleIndex, 1);

            saveToStorage();
            renderProducts();
            renderSalesHistory();
            showToast("Venda estornada com sucesso e itens devolvidos ao estoque!", "success");
        });
    };

    // --- BACKUP & RESTAURAÇÃO ---
    const exportData = () => {
        const data = { products, sales };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_equipamentos_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Backup exportado com sucesso!", "success");
    };

    const importData = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data && Array.isArray(data.products)) {
                    products = data.products;
                    sales = data.sales || [];
                    saveToStorage();
                    renderProducts();
                    renderSaleProducts();
                    renderSalesHistory();
                    showToast("Dados restaurados com sucesso!", "success");
                } else {
                    showToast("Estrutura do arquivo de backup é inválida.", "error");
                }
            } catch (err) {
                showToast("Erro ao processar arquivo JSON.", "error");
            }
            if (elements.importFile) elements.importFile.value = '';
            if (elements.importFileMobile) elements.importFileMobile.value = '';
        };
        reader.readAsText(file);
    };

    // --- DELEGAÇÃO DE EVENTOS ---
    const initEventListeners = () => {
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        elements.searchProduct.addEventListener('input', renderProducts);
        elements.searchSaleProduct.addEventListener('input', renderSaleProducts);
        elements.searchHistory.addEventListener('input', renderSalesHistory);

        elements.btnOpenModalAdd.addEventListener('click', () => openProductModal());
        elements.btnCloseModal.addEventListener('click', closeProductModal);
        elements.btnCancelModal.addEventListener('click', closeProductModal);
        elements.formProduct.addEventListener('submit', handleProductFormSubmit);

        elements.productsTableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const { action, id } = btn.dataset;
            if (action === 'edit') openProductModal(id);
            if (action === 'delete') deleteProduct(id);
        });

        elements.saleProductsTableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            if (btn.dataset.action === 'add-cart') addToCart(btn.dataset.id);
        });

        elements.cartItems.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            if (btn.dataset.action === 'remove-cart') removeFromCart(btn.dataset.id);
        });

        elements.btnClearCart.addEventListener('click', clearCart);
        elements.btnCheckout.addEventListener('click', checkoutSale);

        elements.salesHistoryTableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            if (btn.dataset.action === 'cancel-sale') cancelSale(btn.dataset.id);
        });

        if (elements.btnExport) elements.btnExport.addEventListener('click', exportData);
        if (elements.importFile) elements.importFile.addEventListener('change', importData);
        if (elements.btnExportMobile) elements.btnExportMobile.addEventListener('click', exportData);
        if (elements.importFileMobile) elements.importFileMobile.addEventListener('change', importData);

        elements.btnConfirmCancel.addEventListener('click', closeConfirmModal);
        elements.btnConfirmOk.addEventListener('click', () => {
            if (typeof pendingAction === 'function') pendingAction();
            closeConfirmModal();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeProductModal();
                closeConfirmModal();
            }
        });
    };

    // --- INICIALIZAÇÃO ---
    window.addEventListener('DOMContentLoaded', () => {
        initEventListeners();
        renderProducts();
        renderSaleProducts();
        renderCart();
        renderSalesHistory();
    });

    window.filtrarProdutos = (botaoClicado, modeloDesejado) => {
        const searchInput = document.getElementById('search-product');
        if (!searchInput) return;

        // Remove a classe azul de todos e devolve o contorno padrão
        document.querySelectorAll('.btn-filtro').forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline');
        });

        // Adiciona a classe azul apenas no botão que foi clicado
        botaoClicado.classList.remove('btn-outline');
        botaoClicado.classList.add('btn-primary');
        
        // Aplica o filtro na tabela
        searchInput.value = modeloDesejado === 'TODOS' ? '' : modeloDesejado;
        searchInput.dispatchEvent(new Event('input'));
    };
})();