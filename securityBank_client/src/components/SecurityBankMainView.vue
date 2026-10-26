<template>
    <div class="bank-page">

        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bank-navbar">
            <div class="container">
                <a class="navbar-brand fw-bold" href="#">
                    <i class="bi bi-shield-lock-fill me-2"></i>
                    SecurityBank
                </a>

                <div class="navbar-nav ms-auto">
                    <a class="nav-link active" href="#">Inicio</a>
                    <a class="nav-link" href="#movimientos">Movimientos</a>
                    <a class="nav-link" href="#">Mi perfil</a>
                </div>
            </div>
        </nav>

        <!-- Contenido -->
        <div class="container py-5">

            <h2 class="fw-bold mb-2">Bienvenido a SecurityBank</h2>
            <p class="text-secondary mb-4">
                Consulta el estado de tu cuenta bancaria.
            </p>

            <!-- Saldo -->
            <div class="card balance-card mb-4">
                <div class="card-body p-4">
                    <p class="mb-2">Saldo disponible</p>
                    <h1 class="fw-bold">8.420,50 €</h1>
                    <p class="mb-0">
                        <i class="bi bi-credit-card me-2"></i>
                        Cuenta personal ···· 4821
                    </p>
                </div>
            </div>

            <!-- Acciones -->
            <div class="row g-3 mb-5">
                <h2 clas="center"> Movimientos </h2>

                <div class="col-md-4">
                    <button class="btn btn-primary w-100 py-3">
                        <i class="bi bi-arrow-left-right me-2"></i>
                        Todos
                    </button>
                </div>

                <div class="col-md-4">
                    <button class="btn btn-outline-primary w-100 py-3">
                        <i class="bi bi-credit-card me-2"></i>
                        Ingresos
                    </button>
                </div>

                <div class="col-md-4">
                    <button class="btn btn-outline-primary w-100 py-3">
                        <i class="bi bi-person me-2"></i>
                        Gastos
                    </button>
                </div>
            </div>

            <!-- Movimientos -->
            <div class="card" id="movimientos">
                <div class="card-header bg-white py-3">
                    <h5 class="mb-0 fw-bold">Últimos movimientos</h5>
                </div>

                <div class="card-body">
                    <div class="movement">
                        <span>
                            <i class="bi bi-wallet2 me-2 text-primary"></i>
                            Nómina
                        </span>
                        <strong class="text-success">+1.200,00 €</strong>
                    </div>

                    <div class="movement">
                        <span>
                            <i class="bi bi-cart me-2 text-primary"></i>
                            Compra supermercado
                        </span>
                        <strong>-46,85 €</strong>
                    </div>

                    <div class="movement">
                        <span>
                            <i class="bi bi-receipt me-2 text-primary"></i>
                            Suscripción
                        </span>
                        <strong>-13,99 €</strong>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<style scoped>
.bank-page {
    min-height: 100vh;
    background-color: #f4f7fb;
}

.bank-navbar {
    background-color: #163b65;
}

.navbar-brand {
    font-size: 1.3rem;
}

.balance-card {
    background: linear-gradient(135deg, #163b65, #2878c8);
    color: white;
    border: none;
    border-radius: 16px;
}

.card {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
}

.movement {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 0;
    border-bottom: 1px solid #edf0f5;
}

.movement:last-child {
    border-bottom: none;
}

.btn {
    border-radius: 10px;
    font-weight: 500;
}

.btn-primary {
    background-color: #163b65;
    border-color: #163b65;
}

.btn-primary:hover {
    background-color: #0f2d4d;
    border-color: #0f2d4d;
}
</style>