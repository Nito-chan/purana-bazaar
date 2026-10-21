// ==========================================
// PURANA BAZAAR - SUPABASE CONNECTION
// ==========================================

const SUPABASE_URL = "https://<project-ref>.supabase.co";

const SUPABASE_KEY = "sb_publishable_<redacted>";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("✅ Supabase connected");








console.log("Purana Bazaar started!");


// ============================================
// GET PRODUCTS
// ============================================

function getProducts() {

    return JSON.parse(
        localStorage.getItem("puranaBazaarProducts")
    ) || [];
}


// ============================================
// SAVE PRODUCTS
// ============================================

function saveProducts(products) {

    localStorage.setItem(
        "puranaBazaarProducts",
        JSON.stringify(products)
    );
}


// ============================================
// DEFAULT PRODUCTS
// ============================================

function createDefaultProducts() {

    let products = getProducts();

    if (products.length === 0) {

        products = [

            {
                id: Date.now() + 1,
                name: "Used Smartphone",
                price: "8000",
                category: "Mobile",
                description: "Good condition smartphone. Fully working.",
                location: "Nearby",
                image: "",
                emoji: "📱"
            },

            {
                id: Date.now() + 2,
                name: "Second Hand Laptop",
                price: "18000",
                category: "Laptop",
                description: "8GB RAM • Good condition",
                location: "Nearby",
                image: "",
                emoji: "💻"
            }

        ];

        saveProducts(products);
    }
}


// ============================================
// SHOW ALL PRODUCTS
// ============================================

function showProducts(products = getProducts()) {

    let container =
        document.getElementById("userProducts");

    container.innerHTML = "";

    if (products.length === 0) {

        container.innerHTML = `
            <div class="no-products">
                <div>🔍</div>
                <p>No products found</p>
            </div>
        `;

        return;
    }


    products.forEach(function(product) {

        let card = document.createElement("div");

        card.className = "product-card";

        card.onclick = function() {
            openProduct(product.id);
        };


        let imageHTML = "";

        if (product.image) {

            imageHTML = `
                <img
                    src="${product.image}"
                    alt="${product.name}"
                >
            `;

        } else {

            imageHTML = `
                <div class="product-placeholder">
                    ${product.emoji || "📦"}
                </div>
            `;
        }


        card.innerHTML = `

            ${imageHTML}

            <div class="product-info">

                <h3>${product.name}</h3>

                <p>
                    ${product.description || "Good condition"}
                </p>

                <span class="product-price">
                    ₹${product.price}
                </span>

                <span class="product-location">
                    📍 ${product.location || "Nearby"}
                </span>

            </div>
        `;


        container.appendChild(card);

    });
}


// ============================================
// SEARCH
// ============================================

function searchProducts() {

    let search =
        document.getElementById("searchInput")
        .value
        .toLowerCase()
        .trim();


    let products = getProducts();


    if (search === "") {

        document.getElementById("productHeading")
            .innerText = "Nearby Items";

        showProducts(products);

        return;
    }


    let filtered = products.filter(function(product) {

        return (

            product.name.toLowerCase().includes(search) ||

            product.category.toLowerCase().includes(search) ||

            (product.description || "")
                .toLowerCase()
                .includes(search)

        );

    });


    document.getElementById("productHeading")
        .innerText = "Search Results";

    showProducts(filtered);
}


// ============================================
// CATEGORY FILTER
// ============================================

function filterCategory(category) {

    let products = getProducts();


    let filtered = products.filter(function(product) {

        return product.category.toLowerCase()
            === category.toLowerCase();

    });


    document.getElementById("productHeading")
        .innerText = category + " Items";


    document.getElementById("searchInput").value = "";


    showProducts(filtered);
}


// ============================================
// SEE ALL
// ============================================

function showAllProducts() {

    document.getElementById("searchInput").value = "";

    document.getElementById("productHeading")
        .innerText = "Nearby Items";

    showProducts();
}



// ============================================
// PROFESSIONAL PRODUCT DETAILS
// ============================================

function openProduct(productId) {

    let products = getProducts();

    let product = products.find(function(item) {
        return String(item.id) === String(productId);
    });

    if (!product) return;


    let page =
        document.getElementById("productPage");

    let content =
        document.getElementById("productDetailsContent");


    // PRODUCT IMAGE

    let imageHTML = product.image

        ? `
            <img
                class="product-detail-image"
                src="${product.image}"
                alt="${product.name}"
            >
        `

        : `
            <div class="product-detail-image product-detail-placeholder">
                ${product.emoji || "📦"}
            </div>
        `;


    // SELLER

    let sellerName =
        product.sellerName ||
        "Purana Bazaar Seller";

    let sellerCity =
        product.city ||
        "Location not available";


    // DETAILS

    content.innerHTML = `

        ${imageHTML}


        <div class="professional-detail-card">

            <div class="detail-top-row">

                <div>

                    <span class="detail-category">
                        ${product.category || "Other"}
                    </span>

                    <h1>
                        ${product.name}
                    </h1>

                </div>

                <div class="detail-price">
                    ₹${product.price}
                </div>

            </div>


            <div class="detail-location-box">

                <span>📍</span>

                <div>

                    <strong>
                        ${sellerCity}
                    </strong>

                    <small>
                        ${product.location || "Nearby"}
                    </small>

                </div>

            </div>


            <div class="detail-section">

                <h3>About this product</h3>

                <p class="detail-info">
                    ${
                        product.description ||
                        "Seller has not added a description."
                    }
                </p>

            </div>


            <div class="detail-section">

                <h3>Product Information</h3>

                <div class="info-row">

                    <span>Category</span>

                    <strong>
                        ${product.category || "Other"}
                    </strong>

                </div>


                <div class="info-row">

                    <span>Condition</span>

                    <strong>
                        Used
                    </strong>

                </div>


                <div class="info-row">

                    <span>Location</span>

                    <strong>
                        ${product.location || "Nearby"}
                    </strong>

                </div>

            </div>


            <!-- SELLER -->

            <div
                class="professional-seller-card"
                onclick="openSellerProfile(${product.id})"
            >

                <div class="professional-seller-avatar">
                    👤
                </div>


                <div class="professional-seller-info">

                    <strong>
                        ${sellerName}
                    </strong>

                    <span>
                        📍 ${sellerCity}
                    </span>

                    <small>
                        View seller profile
                    </small>

                </div>


                <div class="seller-arrow">
                    ›
                </div>

            </div>


            <!-- ACTIONS -->

            <div class="professional-actions">


                <button
                    class="interest-button"
                    onclick="markInterested(${product.id})"
                >
                    ⭐ I'm Interested
                </button>


                <button
                    class="call-seller-button"
                    onclick="callSeller(${product.id})"
                >
                    📞 Call Seller
                </button>


                <button
                    class="chat-button"
                    onclick="openChatWithSeller(${product.id})"
                >
                    💬 Chat with Seller
                </button>


                <button
                    class="favourite-button"
                    onclick="addFavourite(${product.id})"
                >
                    ❤️ Add to Favourite
                </button>


                <button
                    class="report-button"
                    onclick="openReport(${product.id})"
                >
                    🚨 Report Product
                </button>

            </div>

        </div>
    `;


    page.style.display = "block";
}



// ============================================
// CLOSE PRODUCT
// ============================================

function closeProduct() {

    document.getElementById("productPage")
        .style.display = "none";
}


// ============================================
// SELL PAGE
// ============================================

function openSellPage() {

    document.getElementById("sellPage")
        .style.display = "block";
}


function closeSellPage() {

    document.getElementById("sellPage")
        .style.display = "none";
}


// ============================================
// POST PRODUCT - SUPABASE
// ============================================

async function postItem() {

    const name =
        document.getElementById("itemName").value.trim();

    const price =
        document.getElementById("itemPrice").value.trim();

    const category =
        document.getElementById("itemCategory").value.trim();

    const location =
        document.getElementById("itemLocation")?.value.trim() || "";

    const city =
        document.getElementById("itemCity")?.value.trim() || "";

    const description =
        document.getElementById("itemDescription").value.trim();

    const imageFile =
        document.getElementById("itemImage").files[0];


    // -----------------------------
    // VALIDATION
    // -----------------------------

    if (!name || !price || !category) {

        alert(
            "Please fill Product Name, Price and Category."
        );

        return;
    }


    if (!imageFile) {

        alert(
            "Please select a product photo."
        );

        return;
    }


    // -----------------------------
    // CHECK LOGIN
    // -----------------------------

    const {
        data: authData
    } = await supabaseClient.auth.getUser();


    const user = authData?.user;


    if (!user) {

        alert(
            "Please login before posting a product."
        );

        return;
    }


    try {

        // -----------------------------
        // IMAGE UPLOAD
        // -----------------------------

        const fileExtension =
            imageFile.name
                .split(".")
                .pop();

        const fileName =
            `${user.id}/${Date.now()}.${fileExtension}`;


        const {
            error: uploadError
        } =
            await supabaseClient
                .storage
                .from("product-images")
                .upload(
                    fileName,
                    imageFile,
                    {
                        cacheControl: "3600",
                        upsert: false
                    }
                );


        if (uploadError) {

            console.error(
                "Image Upload Error:",
                uploadError
            );

            alert(
                "❌ Image upload failed: " +
                uploadError.message
            );

            return;
        }


        // -----------------------------
        // GET IMAGE URL
        // -----------------------------

        const {
            data: imageData
        } =
            supabaseClient
                .storage
                .from("product-images")
                .getPublicUrl(fileName);


        const imageUrl =
            imageData.publicUrl;


        // -----------------------------
        // SAVE PRODUCT
        // -----------------------------

        const {
            data: product,
            error: productError
        } =
            await supabaseClient
                .from("products")
                .insert({

                    seller_id: user.id,

                    name: name,

                    price: Number(price),

                    category: category,

                    location:
                        location || "Nearby",

                    city:
                        city || "Other",

                    description:
                        description ||
                        "Good condition",

                    image_url:
                        imageUrl

                })
                .select()
                .single();


        if (productError) {

            console.error(
                "Product Database Error:",
                productError
            );

            alert(
                "❌ Product save failed: " +
                productError.message
            );

            return;
        }


        console.log(
            "Product saved:",
            product
        );


        // -----------------------------
        // SUCCESS
        // -----------------------------

        alert(
            "✅ Product successfully posted!"
        );


        // Clear form

        document.getElementById(
            "itemName"
        ).value = "";

        document.getElementById(
            "itemPrice"
        ).value = "";

        document.getElementById(
            "itemCategory"
        ).value = "";

        if (document.getElementById("itemLocation")) {

            document.getElementById(
                "itemLocation"
            ).value = "";

        }

        if (document.getElementById("itemCity")) {

            document.getElementById(
                "itemCity"
            ).value = "";

        }

        document.getElementById(
            "itemDescription"
        ).value = "";

        document.getElementById(
            "itemImage"
        ).value = "";


        closeSellPage();


        // Load products from Supabase

        await loadProducts();


    } catch (error) {

        console.error(
            "Post Product Error:",
            error
        );

        alert(
            "❌ Something went wrong."
        );

    }
}

// ============================================
// LOAD PRODUCTS FROM SUPABASE
// ============================================

async function loadProducts() {

    const {
        data: products,
        error
    } =
        await supabaseClient
            .from("products")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Load Products Error:",
            error
        );

        return;
    }


    console.log(
        "Supabase Products:",
        products
    );


    showProducts(products || []);
}

// ============================================
// FAVOURITE
// ============================================

function addFavourite(productId) {

    let favourites =
        JSON.parse(
            localStorage.getItem("puranaBazaarFavourites")
        ) || [];


    if (!favourites.includes(productId)) {

        favourites.push(productId);

        localStorage.setItem(
            "puranaBazaarFavourites",
            JSON.stringify(favourites)
        );

        alert("❤️ Added to Favourite");

    } else {

        alert("Already in Favourite");

    }
}


// ============================================
// FAVOURITES PAGE
// ============================================

function showFavourites() {

    let favourites =
        JSON.parse(
            localStorage.getItem("puranaBazaarFavourites")
        ) || [];


    let products = getProducts();


    let favouriteProducts =
        products.filter(function(product) {

            return favourites.includes(product.id);

        });


    document.getElementById("productHeading")
        .innerText = "Favourite Items";


    showProducts(favouriteProducts);
}


// ============================================
// CHAT
// ============================================

function chatSeller() {

    alert(
        "💬 Chat feature will be connected soon."
    );
}


function openChat() {

    alert(
        "💬 Chat section will be connected soon."
    );
}


// ============================================
// REPORT
// ============================================

function reportProduct() {

    alert(
        "🚨 Thank you. This product has been reported."
    );
}


//========
//profile
//======
// ============================================
// AUTH / LOGIN
// ============================================

function showProfile() {

    let user = JSON.parse(
        localStorage.getItem("puranaBazaarUser")
    );

    if (!user) {
        document.getElementById("authPage").style.display = "block";
        showLogin();
        return;
    }

    document.getElementById("profileName").innerText =
        user.name || "Purana Bazaar User";

    document.getElementById("profileMobile").innerText =
        "📱 " + (user.mobile || "");

    document.getElementById("profileEmail").innerText =
        "📧 " + (user.email || "");

    document.getElementById("profilePage").style.display =
        "block";
}


// ============================================
// CLOSE AUTH PAGE
// ============================================

function closeAuthPage() {

    document.getElementById("authPage").style.display =
        "none";
}


// ============================================
// CLOSE PROFILE PAGE
// ============================================

function closeProfilePage() {

    document.getElementById("profilePage").style.display =
        "none";
}


// ============================================
// SHOW SIGNUP
// ============================================

function showSignup() {

    document.getElementById("loginForm").style.display =
        "none";

    document.getElementById("signupForm").style.display =
        "block";
}


// ============================================
// SHOW LOGIN
// ============================================

function showLogin() {

    document.getElementById("signupForm").style.display =
        "none";

    document.getElementById("loginForm").style.display =
        "block";
}



// ==========================================
// SUPABASE SIGNUP
// ==========================================

async function signupUser() {

    const name =
        document.getElementById("signupName")
        .value.trim();

    const mobile =
        document.getElementById("signupMobile")
        .value.trim();

    const email =
        document.getElementById("signupEmail")
        .value.trim();

    const password =
        document.getElementById("signupPassword")
        .value;


    if (!name || !mobile || !email || !password) {

        alert("Please fill all details.");

        return;
    }


    if (password.length < 6) {

        alert(
            "Password must be at least 6 characters."
        );

        return;
    }


    const {
        data,
        error
    } = await supabaseClient.auth.signUp({

        email: email,

        password: password,

        options: {

            data: {
                name: name,
                mobile: mobile
            }

        }

    });


    if (error) {

        console.error(error);

        alert(
            "❌ " + error.message
        );

        return;
    }


    // Save basic session locally
    if (data.user) {

        const user = {

            id: data.user.id,

            name: name,

            mobile: mobile,

            email: email

        };


        localStorage.setItem(
            "puranaBazaarUser",
            JSON.stringify(user)
        );

    }


    alert(
        "✅ Account created successfully!"
    );


    closeAuthPage();

    showProfile();

}


// ==========================================
// SUPABASE LOGIN
// ==========================================

async function loginUser() {

    const email =
        document.getElementById("loginEmail")
        .value.trim();

    const password =
        document.getElementById("loginPassword")
        .value;


    if (!email || !password) {

        alert(
            "Please enter email and password."
        );

        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient.auth.signInWithPassword({

            email: email,

            password: password

        });


    if (error) {

        console.error(error);

        alert(
            "❌ " + error.message
        );

        return;
    }


    const authUser =
        data.user;


    // Get profile
    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();


    const user = {

        id: authUser.id,

        name:
            profile?.name ||
            authUser.user_metadata?.name ||
            "Purana Bazaar User",

        mobile:
            profile?.mobile ||
            authUser.user_metadata?.mobile ||
            "",

        email:
            authUser.email

    };


    localStorage.setItem(
        "puranaBazaarUser",
        JSON.stringify(user)
    );


    alert(
        "✅ Login successful!"
    );


    closeAuthPage();

    showProfile();

}



// ==========================================
// SUPABASE LOGOUT
// ==========================================

async function logoutUser() {

    await supabaseClient.auth.signOut();


    localStorage.removeItem(
        "puranaBazaarUser"
    );


    document.getElementById(
        "profilePage"
    ).style.display = "none";


    alert(
        "✅ You have been logged out."
    );

}






// ============================================
// MY PRODUCTS
// ============================================

let editingProductId = null;


function showMyProducts() {

    let user = JSON.parse(
        localStorage.getItem("puranaBazaarUser")
    );

    if (!user) {

        alert("Please login first.");

        return;
    }


    document.getElementById("profilePage")
        .style.display = "none";


    document.getElementById("myProductsPage")
        .style.display = "block";


    loadMyProducts();
}


// ============================================
// LOAD MY PRODUCTS
// ============================================

function loadMyProducts() {

    let products = getProducts();

    let container =
        document.getElementById("myProductsList");


    container.innerHTML = "";


    if (products.length === 0) {

        container.innerHTML = `
            <div class="no-products">
                <div>📦</div>
                <p>You haven't listed any products yet.</p>
            </div>
        `;

        return;
    }


    products.forEach(function(product) {

        let card =
            document.createElement("div");

        card.className =
            "my-product-card";


        let imageHTML = product.image

            ? `
                <img
                    src="${product.image}"
                    alt="${product.name}"
                >
            `

            : `
                <div class="my-product-placeholder">
                    ${product.emoji || "📦"}
                </div>
            `;


        card.innerHTML = `

            ${imageHTML}

            <div class="my-product-info">

                <h3>${product.name}</h3>

                <div class="my-product-price">
                    ₹${product.price}
                </div>

                <div class="my-product-actions">

                    <button
                        class="edit-btn"
                        onclick="editProduct(${product.id})"
                    >
                        ✏️ Edit
                    </button>

                    <button
                        class="delete-btn"
                        onclick="deleteProduct(${product.id})"
                    >
                        🗑️ Delete
                    </button>

                </div>

            </div>
        `;


        container.appendChild(card);

    });
}


// ============================================
// CLOSE MY PRODUCTS
// ============================================

function closeMyProducts() {

    document.getElementById("myProductsPage")
        .style.display = "none";

    document.getElementById("profilePage")
        .style.display = "block";
}


// ============================================
// DELETE PRODUCT
// ============================================

function deleteProduct(productId) {

    let confirmDelete =
        confirm(
            "Are you sure you want to delete this product?"
        );


    if (!confirmDelete) {
        return;
    }


    let products = getProducts();


    products =
        products.filter(function(product) {

            return String(product.id)
                !== String(productId);

        });


    saveProducts(products);


    alert("🗑️ Product deleted successfully!");


    loadMyProducts();

    showProducts();
}


// ============================================
// EDIT PRODUCT
// ============================================

function editProduct(productId) {

    let products = getProducts();


    let product =
        products.find(function(item) {

            return String(item.id)
                === String(productId);

        });


    if (!product) {
        return;
    }


    editingProductId = productId;


    document.getElementById("editName").value =
        product.name;

    document.getElementById("editPrice").value =
        product.price;

    document.getElementById("editLocation").value =
        product.location || "";

    document.getElementById("editDescription").value =
        product.description || "";


    document.getElementById("myProductsPage")
        .style.display = "none";


    document.getElementById("editProductPage")
        .style.display = "block";
}


// ============================================
// SAVE EDITED PRODUCT
// ============================================

function saveEditedProduct() {

    if (!editingProductId) {
        return;
    }


    let name =
        document.getElementById("editName")
        .value.trim();

    let price =
        document.getElementById("editPrice")
        .value.trim();

    let location =
        document.getElementById("editLocation")
        .value.trim();

    let description =
        document.getElementById("editDescription")
        .value.trim();


    if (!name || !price) {

        alert(
            "Product name and price are required."
        );

        return;
    }


    let products = getProducts();


    let product =
        products.find(function(item) {

            return String(item.id)
                === String(editingProductId);

        });


    if (!product) {
        return;
    }


    product.name = name;

    product.price = price;

    product.location =
        location || "Nearby";

    product.description =
        description || "Good condition";


    saveProducts(products);


    alert("✅ Product updated successfully!");


    closeEditProduct();

    showMyProducts();

    showProducts();
}


// ============================================
// CLOSE EDIT PAGE
// ============================================

function closeEditProduct() {

    document.getElementById("editProductPage")
        .style.display = "none";

    document.getElementById("myProductsPage")
        .style.display = "block";

    editingProductId = null;
}



// ============================================
// HOME
// ============================================

function goHome() {

    showAllProducts();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ============================================
// START APP
// ============================================

createDefaultProducts();

showProducts();


// =================================================
// SELLER PROFILE
// =================================================

let selectedChatProduct = null;
let selectedReportProduct = null;


function openSellerProfile(productId) {

    let products = getProducts();

    let product =
        products.find(function(item) {
            return String(item.id) === String(productId);
        });


    if (!product) return;


    let sellerName =
        product.sellerName || "Purana Bazaar Seller";

    let sellerMobile =
        product.sellerMobile || "";

    let sellerCity =
        product.city || "Other";


    let sellerProducts =
        products.filter(function(item) {

            return (
                item.sellerMobile &&
                item.sellerMobile === sellerMobile
            );

        });


    let html = `

        <div class="seller-card">

            <div class="seller-avatar">
                👤
            </div>

            <h1>${sellerName}</h1>

            <p>📍 ${sellerCity}</p>

            <p>
                🛍️ ${sellerProducts.length}
                Listed Item(s)
            </p>

            ${
                sellerMobile
                ? `
                    <button
                        class="seller-contact-button"
                        onclick="contactSeller('${sellerMobile}')"
                    >
                        📱 Contact Seller
                    </button>
                `
                : ""
            }

            <button
                class="seller-chat-button"
                onclick="openChatWithSeller(${product.id})"
            >
                💬 Chat with Seller
            </button>


            <h2 class="seller-products-title">
                Seller's Products
            </h2>

            <div class="product-grid">

                ${sellerProducts.map(function(item) {

                    return `

                        <div
                            class="product-card"
                            onclick="openProduct(${item.id})"
                        >

                            ${
                                item.image

                                ? `
                                    <img
                                        src="${item.image}"
                                        alt="${item.name}"
                                    >
                                `

                                : `
                                    <div class="product-placeholder">
                                        📦
                                    </div>
                                `
                            }

                            <div class="product-info">

                                <h3>${item.name}</h3>

                                <span class="product-price">
                                    ₹${item.price}
                                </span>

                            </div>

                        </div>

                    `;

                }).join("")}

            </div>

        </div>
    `;


    document.getElementById("sellerContent")
        .innerHTML = html;


    document.getElementById("productPage")
        .style.display = "none";


    document.getElementById("sellerPage")
        .style.display = "block";
}


function closeSellerProfile() {

    document.getElementById("sellerPage")
        .style.display = "none";
}


function contactSeller(number) {

    alert(
        "📱 Seller contact: " + number
    );
}


// =================================================
// CHAT
// =================================================

function getChats() {

    return JSON.parse(
        localStorage.getItem("puranaBazaarChats")
    ) || {};
}


function saveChats(chats) {

    localStorage.setItem(
        "puranaBazaarChats",
        JSON.stringify(chats)
    );
}


function openChatWithSeller(productId) {

    let user = JSON.parse(
        localStorage.getItem("puranaBazaarUser")
    );


    if (!user) {

        alert("👤 Please login first.");

        showProfile();

        return;
    }


    let products = getProducts();

    let product =
        products.find(function(item) {

            return String(item.id)
                === String(productId);

        });


    if (!product) return;


    selectedChatProduct = product;


    document.getElementById("productPage")
        .style.display = "none";

    document.getElementById("sellerPage")
        .style.display = "none";


    document.getElementById("chatPage")
        .style.display = "block";


    document.getElementById("chatSellerName")
        .innerText =
            "💬 " +
            (product.sellerName || "Seller");


    loadChatMessages();

    document.getElementById("messageInput")
        .focus();
}


function loadChatMessages() {

    let user = JSON.parse(
        localStorage.getItem("puranaBazaarUser")
    );


    if (!user || !selectedChatProduct) return;


    let chats = getChats();


    let sellerId =
        selectedChatProduct.sellerMobile ||
        "seller";


    let buyerId =
        user.mobile;


    let chatId =
        buyerId + "_" + sellerId;


    let messages =
        chats[chatId] || [];


    let container =
        document.getElementById("chatMessages");


    container.innerHTML = "";


    if (messages.length === 0) {

        container.innerHTML = `
            <div class="no-products">
                <div>💬</div>
                <p>Start the conversation</p>
            </div>
        `;

        return;
    }


    messages.forEach(function(message) {

        let div =
            document.createElement("div");


        div.className =
            "chat-message " +
            (
                message.sender === buyerId
                ? "mine"
                : "theirs"
            );


        div.innerHTML = `

            ${message.text}

            <span class="chat-time">
                ${message.time}
            </span>

        `;


        container.appendChild(div);

    });


    container.scrollTop =
        container.scrollHeight;
}


function sendMessage() {

    let user = JSON.parse(
        localStorage.getItem("puranaBazaarUser")
    );


    if (!user || !selectedChatProduct) return;


    let input =
        document.getElementById("messageInput");


    let text =
        input.value.trim();


    if (!text) return;


    let chats = getChats();


    let sellerId =
        selectedChatProduct.sellerMobile ||
        "seller";


    let buyerId =
        user.mobile;


    let chatId =
        buyerId + "_" + sellerId;


    if (!chats[chatId]) {
        chats[chatId] = [];
    }


    let now =
        new Date().toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    chats[chatId].push({

        sender: buyerId,

        text: text,

        time: now

    });


    saveChats(chats);


    addNotification(
        "New Message",
        `Message sent to ${selectedChatProduct.sellerName || "seller"}`
    );


    input.value = "";

    loadChatMessages();
}


function openChat() {

    let user = JSON.parse(
        localStorage.getItem("puranaBazaarUser")
    );


    if (!user) {

        showProfile();

        return;
    }


    alert(
        "💬 Open a product and tap Chat with Seller."
    );
}


function closeChatPage() {

    document.getElementById("chatPage")
        .style.display = "none";
}


// =================================================
// NOTIFICATIONS
// =================================================

function getNotifications() {

    return JSON.parse(
        localStorage.getItem(
            "puranaBazaarNotifications"
        )
    ) || [];
}


function saveNotifications(notifications) {

    localStorage.setItem(
        "puranaBazaarNotifications",
        JSON.stringify(notifications)
    );
}


function addNotification(title, message) {

    let notifications =
        getNotifications();


    notifications.unshift({

        id: Date.now(),

        title: title,

        message: message,

        time: new Date().toLocaleString(),

        read: false

    });


    saveNotifications(
        notifications.slice(0, 50)
    );
}


function openNotifications() {

    document.getElementById("notificationPage")
        .style.display = "block";


    loadNotifications();
}


function loadNotifications() {

    let notifications =
        getNotifications();


    let container =
        document.getElementById("notificationList");


    container.innerHTML = "";


    if (notifications.length === 0) {

        container.innerHTML = `
            <div class="no-products">
                <div>🔔</div>
                <p>No notifications</p>
            </div>
        `;

        return;
    }


    notifications.forEach(function(item) {

        let div =
            document.createElement("div");


        div.className =
            "notification-item " +
            (!item.read ? "unread" : "");


        div.innerHTML = `

            <strong>
                ${item.title}
            </strong>

            <p>
                ${item.message}
            </p>

            <small>
                ${item.time}
            </small>

        `;


        div.onclick = function() {

            item.read = true;

            saveNotifications(
                notifications
            );

            div.classList.remove("unread");

        };


        container.appendChild(div);

    });
}


function clearNotifications() {

    localStorage.removeItem(
        "puranaBazaarNotifications"
    );


    loadNotifications();
}


function closeNotifications() {

    document.getElementById("notificationPage")
        .style.display = "none";
}


// =================================================
// REPORT & SAFETY
// =================================================

function openReport(productId) {

    selectedReportProduct = productId;


    document.getElementById("reportReason")
        .value = "";

    document.getElementById("reportMessage")
        .value = "";


    document.getElementById("productPage")
        .style.display = "none";


    document.getElementById("reportPage")
        .style.display = "block";
}


function closeReport() {

    document.getElementById("reportPage")
        .style.display = "none";
}


function submitReport() {

    let reason =
        document.getElementById("reportReason")
        .value;


    let message =
        document.getElementById("reportMessage")
        .value.trim();


    if (!reason) {

        alert(
            "Please select a report reason."
        );

        return;
    }


    let reports =
        JSON.parse(
            localStorage.getItem(
                "puranaBazaarReports"
            )
        ) || [];


    reports.push({

        id: Date.now(),

        productId:
            selectedReportProduct,

        reason: reason,

        message: message,

        time: new Date().toLocaleString()

    });


    localStorage.setItem(
        "puranaBazaarReports",
        JSON.stringify(reports)
    );


    addNotification(
        "Report Submitted",
        "Thank you. Your report has been received."
    );


    alert(
        "✅ Report submitted successfully."
    );


    closeReport();
}


// =================================================
// LOCATION FILTER
// =================================================

function filterCity(city) {

    let products =
        getProducts();


    let filtered =
        products.filter(function(product) {

            return (
                (product.city || "")
                    .toLowerCase()
                    === city.toLowerCase()
            );

        });


    document.getElementById("productHeading")
        .innerText =
            city + " Items";


    showProducts(filtered);
}


// =================================================
// START
// =================================================

loadNotifications();

// =====================================================
// PROFESSIONAL SEARCH + ADVANCED FILTER SYSTEM
// =====================================================


function toggleFilters() {

    let panel =
        document.getElementById(
            "advancedFilters"
        );


    panel.classList.toggle("show");

}


// =====================================================
// ADVANCED FILTER
// =====================================================

function applyAdvancedFilters() {

    let products =
        getProducts();


    let search =
        document.getElementById(
            "searchInput"
        ).value
        .toLowerCase()
        .trim();


    let category =
        document.getElementById(
            "filterCategorySelect"
        ).value;


    let city =
        document.getElementById(
            "filterCitySelect"
        ).value;


    let minPrice =
        Number(
            document.getElementById(
                "minPrice"
            ).value
        ) || 0;


    let maxPriceValue =
        document.getElementById(
            "maxPrice"
        ).value;


    let maxPrice =
        maxPriceValue
        ? Number(maxPriceValue)
        : Infinity;


    let sort =
        document.getElementById(
            "sortProducts"
        ).value;


    let filtered =
        products.filter(function(product) {


            // SEARCH

            let searchableText = (

                (product.name || "") +

                " " +

                (product.category || "") +

                " " +

                (product.description || "") +

                " " +

                (product.city || "") +

                " " +

                (product.location || "")

            ).toLowerCase();


            if (
                search &&
                !searchableText.includes(search)
            ) {

                return false;

            }


            // CATEGORY

            if (
                category &&
                (product.category || "")
                    .toLowerCase()
                    !== category.toLowerCase()
            ) {

                return false;

            }


            // CITY

            if (
                city &&
                (product.city || "")
                    .toLowerCase()
                    !== city.toLowerCase()
            ) {

                return false;

            }


            // PRICE

            let price =
                Number(product.price) || 0;


            if (price < minPrice) {

                return false;

            }


            if (price > maxPrice) {

                return false;

            }


            return true;

        });


    // =================================================
    // SORT
    // =================================================

    if (sort === "low") {

        filtered.sort(function(a, b) {

            return (
                Number(a.price) -
                Number(b.price)
            );

        });

    }


    else if (sort === "high") {

        filtered.sort(function(a, b) {

            return (
                Number(b.price) -
                Number(a.price)
            );

        });

    }


    else {

        filtered.sort(function(a, b) {

            return (
                Number(b.id) -
                Number(a.id)
            );

        });

    }


    // =================================================
    // HEADING
    // =================================================

    document.getElementById(
        "productHeading"
    ).innerText =
        filtered.length
        ? "Products For You"
        : "No Products Found";


    // RESULT COUNT

    document.getElementById(
        "resultCount"
    ).innerText =

        filtered.length +
        (
            filtered.length === 1
            ? " Product"
            : " Products"
        );


    // ACTIVE FILTER TEXT

    let active = [];


    if (category) {

        active.push(category);

    }


    if (city) {

        active.push(city);

    }


    if (minPrice > 0) {

        active.push(
            "₹" + minPrice + "+"
        );

    }


    if (
        maxPrice !== Infinity
    ) {

        active.push(
            "Under ₹" + maxPrice
        );

    }


    if (search) {

        active.push(
            '"' + search + '"'
        );

    }


    document.getElementById(
        "activeFilterText"
    ).innerText =

        active.length
        ? active.join(" • ")
        : "All Items";


    showProducts(filtered);

}


// =====================================================
// SEARCH OVERRIDE
// =====================================================

function searchProducts() {

    applyAdvancedFilters();

}


// =====================================================
// CATEGORY OVERRIDE
// =====================================================

function filterCategory(category) {

    document.getElementById(
        "filterCategorySelect"
    ).value = category;


    applyAdvancedFilters();

}


// =====================================================
// SEE ALL / CLEAR EVERYTHING
// =====================================================

function showAllProducts() {

    document.getElementById(
        "searchInput"
    ).value = "";


    document.getElementById(
        "filterCategorySelect"
    ).value = "";


    document.getElementById(
        "filterCitySelect"
    ).value = "";


    document.getElementById(
        "minPrice"
    ).value = "";


    document.getElementById(
        "maxPrice"
    ).value = "";


    document.getElementById(
        "sortProducts"
    ).value = "newest";


    document.getElementById(
        "productHeading"
    ).innerText = "Nearby Items";


    document.getElementById(
        "activeFilterText"
    ).innerText = "All Items";


    let products =
        getProducts();


    document.getElementById(
        "resultCount"
    ).innerText =

        products.length +
        (
            products.length === 1
            ? " Product"
            : " Products"
        );


    showProducts(products);

}


// =====================================================
// CLEAR FILTERS
// =====================================================

function clearAdvancedFilters() {

    document.getElementById(
        "searchInput"
    ).value = "";


    document.getElementById(
        "filterCategorySelect"
    ).value = "";


    document.getElementById(
        "filterCitySelect"
    ).value = "";


    document.getElementById(
        "minPrice"
    ).value = "";


    document.getElementById(
        "maxPrice"
    ).value = "";


    document.getElementById(
        "sortProducts"
    ).value = "newest";


    showAllProducts();

}


// =====================================================
// PROFESSIONAL INITIALIZATION
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        let products =
            getProducts();


        let result =
            document.getElementById(
                "resultCount"
            );


        if (result) {

            result.innerText =

                products.length +
                (
                    products.length === 1
                    ? " Product"
                    : " Products"
                );

        }

    }
);


// ============================================
// I'M INTERESTED
// ============================================

function markInterested(productId) {

    let user = JSON.parse(
        localStorage.getItem("puranaBazaarUser")
    );


    if (!user) {

        alert(
            "👤 Please login first to show your interest."
        );

        showProfile();

        return;
    }


    let products = getProducts();

    let product =
        products.find(function(item) {

            return String(item.id) ===
                String(productId);

        });


    if (!product) return;


    addNotification(
        "⭐ Interest Sent",
        `You are interested in "${product.name}".`
    );


    alert(
        "⭐ Your interest has been saved!"
    );
}



// ============================================
// CALL SELLER
// ============================================

function callSeller(productId) {

    let products = getProducts();

    let product =
        products.find(function(item) {

            return String(item.id) ===
                String(productId);

        });


    if (!product) return;


    let number =
        product.sellerMobile;


    if (!number) {

        alert(
            "📞 Seller contact number is not available."
        );

        return;
    }


    let confirmCall =
        confirm(
            "📞 Call " +
            (product.sellerName || "Seller") +
            "?"
        );


    if (confirmCall) {

        window.location.href =
            "tel:" + number;

    }
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

function getNotifications() {
    return JSON.parse(
        localStorage.getItem("puranaBazaarNotifications") || "[]"
    );
}

function saveNotifications(notifications) {
    localStorage.setItem(
        "puranaBazaarNotifications",
        JSON.stringify(notifications)
    );
}


function addNotification(title, message, productId = null) {

    let notifications = getNotifications();

    notifications.unshift({
        id: Date.now(),
        title: title,
        message: message,
        productId: productId,
        time: new Date().toLocaleString(),
        read: false
    });

    // केवल latest 50 notifications रखें
    notifications = notifications.slice(0, 50);

    saveNotifications(notifications);

    updateNotificationBadge();
}


// ============================================
// SHOW NOTIFICATIONS
// ============================================

function showNotifications() {

    let list =
        document.getElementById("notificationsList");

    if (!list) return;

    let notifications = getNotifications();

    if (notifications.length === 0) {

        list.innerHTML = `
            <div class="empty-notifications">
                🔔
                <h3>No notifications</h3>
                <p>Your notifications will appear here.</p>
            </div>
        `;

        return;
    }


    list.innerHTML = notifications.map(function(notification) {

        return `
            <div
                class="notification-item ${
                    notification.read ? "read" : "unread"
                }"
                onclick="openNotification(${notification.id})"
            >

                <div class="notification-icon">
                    ⭐
                </div>

                <div class="notification-content">

                    <strong>
                        ${notification.title}
                    </strong>

                    <p>
                        ${notification.message}
                    </p>

                    <small>
                        ${notification.time}
                    </small>

                </div>

                ${
                    notification.read
                    ? ""
                    : `<span class="notification-dot"></span>`
                }

            </div>
        `;

    }).join("");
}


// ============================================
// OPEN NOTIFICATION
// ============================================

function openNotification(notificationId) {

    let notifications = getNotifications();

    let notification =
        notifications.find(function(item) {
            return item.id === notificationId;
        });

    if (!notification) return;


    notification.read = true;

    saveNotifications(notifications);

    updateNotificationBadge();

    showNotifications();


    if (notification.productId) {

        openProduct(notification.productId);

    }
}


// ============================================
// MARK ALL AS READ
// ============================================

function markAllNotificationsRead() {

    let notifications = getNotifications();

    notifications.forEach(function(notification) {
        notification.read = true;
    });

    saveNotifications(notifications);

    updateNotificationBadge();

    showNotifications();
}


// ============================================
// CLEAR ALL
// ============================================

function clearAllNotifications() {

    if (!confirm("Clear all notifications?")) {
        return;
    }

    localStorage.removeItem(
        "puranaBazaarNotifications"
    );

    updateNotificationBadge();

    showNotifications();
}


// ============================================
// NOTIFICATION BADGE
// ============================================

function updateNotificationBadge() {

    let notifications = getNotifications();

    let unread =
        notifications.filter(function(notification) {
            return !notification.read;
        }).length;


    let badge =
        document.getElementById("notificationBadge");

    if (!badge) return;


    if (unread > 0) {

        badge.innerText =
            unread > 99 ? "99+" : unread;

        badge.style.display = "flex";

    } else {

        badge.style.display = "none";

    }
}


// ============================================
// START NOTIFICATION SYSTEM
// ============================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        updateNotificationBadge();

    }
);

// =====================================================
// PURANA BAZAAR - PROFESSIONAL MARKETPLACE UPGRADE
// =====================================================


// =====================================================
// 1. SAFE HELPERS
// =====================================================

function getCurrentUser() {

    return JSON.parse(
        localStorage.getItem("puranaBazaarUser")
    );

}


function getBlockedSellers() {

    return JSON.parse(
        localStorage.getItem(
            "puranaBazaarBlockedSellers"
        ) || "[]"
    );

}


function saveBlockedSellers(list) {

    localStorage.setItem(
        "puranaBazaarBlockedSellers",
        JSON.stringify(list)
    );

}


// =====================================================
// 2. PROFESSIONAL PRODUCT CARD
// =====================================================

function createMiniProductCard(product) {

    let imageHTML = product.image

        ? `
            <img
                src="${product.image}"
                alt="${product.name}"
            >
        `

        : `
            <div class="mini-product-placeholder">
                ${product.emoji || "📦"}
            </div>
        `;


    return `

        <div
            class="mini-product-card"
            onclick="openProduct(${product.id})"
        >

            ${imageHTML}

            <div class="mini-product-info">

                <h3>
                    ${product.name}
                </h3>

                <strong>
                    ₹${product.price}
                </strong>

                <span>
                    📍 ${product.city || product.location || "Nearby"}
                </span>

            </div>

        </div>

    `;
}


// =====================================================
// 3. FEATURED PRODUCTS
// =====================================================

function loadFeaturedProducts() {

    let products = getProducts();

    let container =
        document.getElementById(
            "featuredProducts"
        );

    if (!container) return;


    if (products.length === 0) {

        container.innerHTML = `
            <div class="market-empty">
                ⭐ No featured items yet
            </div>
        `;

        return;
    }


    let featured =
        products
        .slice()
        .sort(function(a, b) {

            return Number(b.id) -
                   Number(a.id);

        })
        .slice(0, 6);


    container.innerHTML =
        featured.map(
            createMiniProductCard
        ).join("");
}


function showFeaturedProducts() {

    let products = getProducts();

    let featured =
        products
        .slice()
        .sort(function(a, b) {

            return Number(b.id) -
                   Number(a.id);

        });


    document.getElementById(
        "productHeading"
    ).innerText = "⭐ Featured Items";


    showProducts(featured);
}


// =====================================================
// 4. RECENTLY ADDED
// =====================================================

function loadRecentProducts() {

    let products = getProducts();

    let container =
        document.getElementById(
            "recentProducts"
        );

    if (!container) return;


    let recent =
        products
        .slice()
        .sort(function(a, b) {

            return Number(b.id) -
                   Number(a.id);

        })
        .slice(0, 6);


    if (recent.length === 0) {

        container.innerHTML = `
            <div class="market-empty">
                🆕 No recent listings
            </div>
        `;

        return;
    }


    container.innerHTML =
        recent.map(
            createMiniProductCard
        ).join("");
}


function showRecentProducts() {

    let products = getProducts();

    let recent =
        products
        .slice()
        .sort(function(a, b) {

            return Number(b.id) -
                   Number(a.id);

        });


    document.getElementById(
        "productHeading"
    ).innerText =
        "🆕 Recently Added";


    showProducts(recent);
}


// =====================================================
// 5. POPULAR CATEGORIES
// =====================================================

function loadPopularCategories() {

    let products = getProducts();

    let counts = {};


    products.forEach(function(product) {

        let category =
            product.category ||
            "Other";

        counts[category] =
            (counts[category] || 0) + 1;

    });


    let sorted =
        Object.keys(counts)
        .sort(function(a, b) {

            return counts[b] -
                   counts[a];

        })
        .slice(0, 6);


    let icons = {

        Mobile: "📱",
        Laptop: "💻",
        Furniture: "🪑",
        Bike: "🏍️",
        Cycle: "🚲",
        Books: "📚",
        Other: "📦"

    };


    let container =
        document.getElementById(
            "popularCategories"
        );

    if (!container) return;


    if (sorted.length === 0) {

        container.innerHTML = `
            <div class="market-empty">
                📦 Categories will appear here
            </div>
        `;

        return;
    }


    container.innerHTML =
        sorted.map(function(category) {

            return `

                <div
                    class="popular-category"
                    onclick="filterCategory('${category}')"
                >

                    <div class="popular-category-icon">
                        ${icons[category] || "📦"}
                    </div>

                    <strong>
                        ${category}
                    </strong>

                    <span>
                        ${counts[category]} items
                    </span>

                </div>

            `;

        }).join("");
}


// =====================================================
// 6. PROFESSIONAL SELLER PROFILE
// =====================================================

function openSellerProfile(productId) {

    let products = getProducts();

    let product =
        products.find(function(item) {

            return String(item.id) ===
                String(productId);

        });


    if (!product) return;


    let sellerMobile =
        product.sellerMobile || "";


    let sellerName =
        product.sellerName ||
        "Purana Bazaar Seller";


    let sellerCity =
        product.city ||
        "Other";


    let sellerProducts =
        products.filter(function(item) {

            return (
                item.sellerMobile &&
                item.sellerMobile ===
                sellerMobile
            );

        });


    let blocked =
        getBlockedSellers()
        .includes(sellerMobile);


    let sellerSince =
        sellerProducts.length
        ? "Active Seller"
        : "New Seller";


    let html = `

        <div class="seller-card professional-seller">

            <div class="seller-cover">
                <div class="seller-big-avatar">
                    👤
                </div>
            </div>


            <div class="seller-main-info">

                <h1>
                    ${sellerName}
                </h1>

                <p>
                    📍 ${sellerCity}
                </p>

                <div class="seller-status">
                    ● ${sellerSince}
                </div>

            </div>


            <div class="seller-stats">

                <div>
                    <strong>
                        ${sellerProducts.length}
                    </strong>

                    <span>
                        Listings
                    </span>
                </div>


                <div>
                    <strong>
                        ⭐
                    </strong>

                    <span>
                        Trusted
                    </span>
                </div>


                <div>
                    <strong>
                        📍
                    </strong>

                    <span>
                        Local
                    </span>
                </div>

            </div>


            ${
                sellerMobile
                ? `

                    <button
                        class="seller-contact-button"
                        onclick="callSellerNumber('${sellerMobile}')"
                    >
                        📞 Call Seller
                    </button>

                `
                : ""
            }


            <button
                class="seller-chat-button"
                onclick="openChatWithSeller(${product.id})"
            >
                💬 Chat with Seller
            </button>


            <button
                class="seller-block-button"
                onclick="toggleBlockSeller('${sellerMobile}')"
            >
                ${
                    blocked
                    ? "🔓 Unblock Seller"
                    : "🚫 Block Seller"
                }
            </button>


            <button
                class="seller-report-button"
                onclick="reportSeller('${sellerMobile}')"
            >
                🚨 Report Seller
            </button>


            <h2 class="seller-products-title">
                🛍️ Seller's Products
            </h2>


            <div class="product-grid">

                ${
                    sellerProducts.length

                    ? sellerProducts.map(
                        createSellerProductCard
                      ).join("")

                    : `

                        <div class="no-products">

                            <div>📦</div>

                            <p>
                                No active listings
                            </p>

                        </div>

                    `
                }

            </div>

        </div>

    `;


    document.getElementById(
        "sellerContent"
    ).innerHTML = html;


    document.getElementById(
        "productPage"
    ).style.display = "none";


    document.getElementById(
        "sellerPage"
    ).style.display = "block";

}


function createSellerProductCard(product) {

    return `

        <div
            class="product-card"
            onclick="openProduct(${product.id})"
        >

            ${
                product.image

                ? `
                    <img
                        src="${product.image}"
                        alt="${product.name}"
                    >
                `

                : `
                    <div class="product-placeholder">
                        ${product.emoji || "📦"}
                    </div>
                `
            }


            <div class="product-info">

                <h3>
                    ${product.name}
                </h3>

                <span class="product-price">
                    ₹${product.price}
                </span>

            </div>

        </div>

    `;
}


// =====================================================
// 7. CALL SELLER
// =====================================================

function callSellerNumber(number) {

    if (!number) {

        alert(
            "📞 Seller contact number unavailable."
        );

        return;
    }


    if (
        confirm(
            "📞 Call this seller?"
        )
    ) {

        window.location.href =
            "tel:" + number;

    }

}


// =====================================================
// 8. BLOCK / UNBLOCK SELLER
// =====================================================

function toggleBlockSeller(sellerMobile) {

    if (!sellerMobile) {

        alert(
            "Seller ID unavailable."
        );

        return;
    }


    let blocked =
        getBlockedSellers();


    let index =
        blocked.indexOf(
            sellerMobile
        );


    if (index === -1) {

        if (
            !confirm(
                "🚫 Block this seller? You won't see their products."
            )
        ) {

            return;

        }


        blocked.push(
            sellerMobile
        );


        saveBlockedSellers(
            blocked
        );


        alert(
            "🚫 Seller blocked."
        );

    }

    else {

        blocked.splice(
            index,
            1
        );


        saveBlockedSellers(
            blocked
        );


        alert(
            "🔓 Seller unblocked."
        );

    }


    showAllProducts();
}


// =====================================================
// 9. HIDE BLOCKED SELLER PRODUCTS
// =====================================================

function getVisibleProducts() {

    let products =
        getProducts();


    let blocked =
        getBlockedSellers();


    return products.filter(
        function(product) {

            if (!product.sellerMobile) {
                return true;
            }


            return !blocked.includes(
                product.sellerMobile
            );

        }
    );

}


// =====================================================
// 10. REPORT SELLER
// =====================================================

function reportSeller(sellerMobile) {

    if (!sellerMobile) {

        alert(
            "Seller information unavailable."
        );

        return;
    }


    let reports =
        JSON.parse(
            localStorage.getItem(
                "puranaBazaarSellerReports"
            ) || "[]"
        );


    reports.push({

        id: Date.now(),

        sellerMobile:
            sellerMobile,

        time:
            new Date()
            .toLocaleString(),

        reason:
            "Seller reported"

    });


    localStorage.setItem(
        "puranaBazaarSellerReports",
        JSON.stringify(reports)
    );


    alert(
        "🚨 Seller report submitted successfully."
    );

}


// =====================================================
// 11. BETTER CHAT
// =====================================================

function getChatId(product) {

    let user =
        getCurrentUser();


    if (!user || !product) {
        return null;
    }


    let buyerId =
        user.mobile;


    let sellerId =
        product.sellerMobile ||
        "seller";


    return (
        buyerId +
        "_" +
        sellerId
    );

}


function openChatWithSeller(productId) {

    let user =
        getCurrentUser();


    if (!user) {

        alert(
            "👤 Please login first."
        );

        showProfile();

        return;
    }


    let products =
        getProducts();


    let product =
        products.find(function(item) {

            return String(item.id) ===
                String(productId);

        });


    if (!product) return;


    selectedChatProduct =
        product;


    document.getElementById(
        "productPage"
    ).style.display = "none";


    document.getElementById(
        "sellerPage"
    ).style.display = "none";


    document.getElementById(
        "chatPage"
    ).style.display = "block";


    document.getElementById(
        "chatSellerName"
    ).innerHTML = `

        <div class="chat-person">

            <div class="chat-avatar">
                👤
            </div>

            <div>

                <strong>
                    ${product.sellerName || "Seller"}
                </strong>

                <small>
                    ${product.name}
                </small>

            </div>

        </div>

    `;


    loadChatMessages();


    let input =
        document.getElementById(
            "messageInput"
        );


    if (input) {
        input.focus();
    }

}


// =====================================================
// 12. SEND MESSAGE + CHAT NOTIFICATION
// =====================================================

function sendMessage() {

    let user =
        getCurrentUser();


    if (
        !user ||
        !selectedChatProduct
    ) {

        return;

    }


    let input =
        document.getElementById(
            "messageInput"
        );


    let text =
        input.value.trim();


    if (!text) return;


    let chats =
        getChats();


    let chatId =
        getChatId(
            selectedChatProduct
        );


    if (!chatId) return;


    if (!chats[chatId]) {

        chats[chatId] = [];

    }


    chats[chatId].push({

        sender:
            user.mobile,

        senderName:
            user.name,

        text:
            text,

        time:
            new Date()
            .toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )

    });


    saveChats(chats);


    input.value = "";


    loadChatMessages();

}


// =====================================================
// 13. CHAT LIST
// =====================================================

function showChatList() {

    let user =
        getCurrentUser();


    if (!user) {

        showProfile();

        return;

    }


    let chats =
        getChats();


    let products =
        getProducts();


    let chatProducts = [];


    products.forEach(function(product) {

        let id =
            getChatIdForUsers(
                user.mobile,
                product.sellerMobile ||
                "seller"
            );


        if (
            chats[id] &&
            chats[id].length
        ) {

            chatProducts.push({

                product:
                    product,

                messages:
                    chats[id]

            });

        }

    });


    if (
        chatProducts.length === 0
    ) {

        alert(
            "💬 No conversations yet. Open a product and tap Chat."
        );

        return;

    }


    let message =
        chatProducts
        .map(function(item) {

            let last =
                item.messages[
                    item.messages.length - 1
                ];


            return (
                "💬 " +
                (item.product.sellerName ||
                 "Seller") +
                " — " +
                last.text
            );

        })
        .join("\n");


    alert(message);

}


function getChatIdForUsers(
    buyerId,
    sellerId
) {

    return (
        buyerId +
        "_" +
        sellerId
    );

}


// =====================================================
// 14. PROFESSIONAL INITIALIZATION
// =====================================================

function initializeMarketplace() {

    loadFeaturedProducts();

    loadRecentProducts();

    loadPopularCategories();

    updateNotificationBadge();

}


// Run after page loads

document.addEventListener(
    "DOMContentLoaded",
    function() {

        initializeMarketplace();

    }
);