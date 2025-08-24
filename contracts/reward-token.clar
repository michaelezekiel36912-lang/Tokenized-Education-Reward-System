;; RewardToken.clar
;; SIP-10 compliant fungible token for EDU rewards in the Tokenized Education System
;; Features: Minting with metadata, multiple minters, pausing, burning, admin controls, mint records

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-PAUSED (err u101))
(define-constant ERR-INVALID-AMOUNT (err u102))
(define-constant ERR-INVALID-RECIPIENT (err u103))
(define-constant ERR-INVALID-MINTER (err u104))
(define-constant ERR-ALREADY-REGISTERED (err u105))
(define-constant ERR-METADATA-TOO-LONG (err u106))
(define-constant ERR-TRANSFER-FAILED (err u107))
(define-constant ERR-BURN-FAILED (err u108))
(define-constant ERR-NOT-OWNER (err u109))
(define-constant ERR-INVALID-SPENDER (err u110))
(define-constant ERR-ALLOWANCE-INSUFFICIENT (err u111))
(define-constant MAX-METADATA-LEN u500)

;; Data Variables
(define-data-var token-name (string-ascii 32) "EducationToken")
(define-data-var token-symbol (string-ascii 10) "EDU")
(define-data-var token-decimals uint u6)
(define-data-var total-supply uint u0)
(define-data-var contract-paused bool false)
(define-data-var admin principal tx-sender)
(define-data-var mint-counter uint u0)

;; Data Maps
(define-map balances principal uint)
(define-map minters principal bool)
(define-map mint-records uint {amount: uint, recipient: principal, metadata: (string-utf8 500), timestamp: uint})
(define-map allowances {owner: principal, spender: principal} uint)

;; Read-only Functions
(define-read-only (get-name)
  (ok (var-get token-name))
)

(define-read-only (get-symbol)
  (ok (var-get token-symbol))
)

(define-read-only (get-decimals)
  (ok (var-get token-decimals))
)

(define-read-only (get-total-supply)
  (ok (var-get total-supply))
)

(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account)))
)

(define-read-only (get-mint-record (token-id uint))
  (map-get? mint-records token-id)
)

(define-read-only (is-minter (account principal))
  (default-to false (map-get? minters account))
)

(define-read-only (is-paused)
  (var-get contract-paused)
)

(define-read-only (get-allowance (owner principal) (spender principal))
  (ok (default-to u0 (map-get? allowances {owner: owner, spender: spender})))
)

(define-read-only (get-admin)
  (ok (var-get admin))
)

(define-read-only (get-mint-counter)
  (ok (var-get mint-counter))
)

;; Public Functions
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)
    (var-set admin new-admin)
    (ok true)
  )
)

(define-public (pause-contract)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)
    (var-set contract-paused true)
    (ok true)
  )
)

(define-public (unpause-contract)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)
    (var-set contract-paused false)
    (ok true)
  )
)

(define-public (add-minter (minter principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)
    (asserts! (not (is-minter minter)) ERR-ALREADY-REGISTERED)
    (map-set minters minter true)
    (ok true)
  )
)

(define-public (remove-minter (minter principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)
    (map-set minters minter false)
    (ok true)
  )
)

(define-public (mint (amount uint) (recipient principal) (metadata (string-utf8 500)))
  (let
    (
      (current-balance (default-to u0 (map-get? balances recipient)))
      (token-id (+ (var-get mint-counter) u1))
    )
    (asserts! (not (var-get contract-paused)) ERR-PAUSED)
    (asserts! (is-minter tx-sender) ERR-INVALID-MINTER)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq recipient CONTRACT-OWNER)) ERR-INVALID-RECIPIENT) ;; Prevent mint to contract owner as example
    (asserts! (<= (len metadata) MAX-METADATA-LEN) ERR-METADATA-TOO-LONG)
    (map-set balances recipient (+ current-balance amount))
    (var-set total-supply (+ (var-get total-supply) amount))
    (map-set mint-records token-id {amount: amount, recipient: recipient, metadata: metadata, timestamp: block-height})
    (var-set mint-counter token-id)
    (ok true)
  )
)

(define-public (transfer (amount uint) (sender principal) (recipient principal))
  (begin
    (asserts! (not (var-get contract-paused)) ERR-PAUSED)
    (asserts! (is-eq tx-sender sender) ERR-NOT-OWNER)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq recipient CONTRACT-OWNER)) ERR-INVALID-RECIPIENT)
    (try! (as-contract (transfer-internal amount sender recipient)))
    (ok true)
  )
)

(define-public (transfer-from (amount uint) (owner principal) (recipient principal))
  (let
    (
      (current-allowance (default-to u0 (map-get? allowances {owner: owner, spender: tx-sender})))
    )
    (asserts! (not (var-get contract-paused)) ERR-PAUSED)
    (asserts! (>= current-allowance amount) ERR-ALLOWANCE-INSUFFICIENT)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq recipient CONTRACT-OWNER)) ERR-INVALID-RECIPIENT)
    (map-set allowances {owner: owner, spender: tx-sender} (- current-allowance amount))
    (try! (as-contract (transfer-internal amount owner recipient)))
    (ok true)
  )
)

(define-public (approve (spender principal) (amount uint))
  (begin
    (asserts! (not (var-get contract-paused)) ERR-PAUSED)
    (asserts! (not (is-eq spender tx-sender)) ERR-INVALID-SPENDER)
    (map-set allowances {owner: tx-sender, spender: spender} amount)
    (ok true)
  )
)

(define-public (burn (amount uint))
  (let
    (
      (current-balance (default-to u0 (map-get? balances tx-sender)))
    )
    (asserts! (not (var-get contract-paused)) ERR-PAUSED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (>= current-balance amount) ERR-INVALID-AMOUNT)
    (map-set balances tx-sender (- current-balance amount))
    (var-set total-supply (- (var-get total-supply) amount))
    (ok true)
  )
)

;; Private Functions
(define-private (transfer-internal (amount uint) (sender principal) (recipient principal))
  (let
    (
      (sender-balance (default-to u0 (map-get? balances sender)))
      (recipient-balance (default-to u0 (map-get? balances recipient)))
    )
    (asserts! (>= sender-balance amount) ERR-INVALID-AMOUNT)
    (map-set balances sender (- sender-balance amount))
    (map-set balances recipient (+ recipient-balance amount))
    (ok true)
  )
)

;; Additional Utility Functions
(define-public (bulk-mint (recipients (list 10 {recipient: principal, amount: uint, metadata: (string-utf8 500)})))
  (fold bulk-mint-iter recipients (ok u0))
)

(define-private (bulk-mint-iter (entry {recipient: principal, amount: uint, metadata: (string-utf8 500)}) (previous (response uint uint)))
  (match previous
    count (begin
      (try! (mint (get amount entry) (get recipient entry) (get metadata entry)))
      (ok (+ count u1))
    )
    error (err error)
  )
)

(define-read-only (get-multiple-balances (accounts (list 10 principal)))
  (map get-balance accounts)
)

(define-public (increase-allowance (spender principal) (added-amount uint))
  (let
    (
      (current-allowance (default-to u0 (map-get? allowances {owner: tx-sender, spender: spender})))
    )
    (asserts! (not (var-get contract-paused)) ERR-PAUSED)
    (map-set allowances {owner: tx-sender, spender: spender} (+ current-allowance added-amount))
    (ok true)
  )
)

(define-public (decrease-allowance (spender principal) (subtracted-amount uint))
  (let
    (
      (current-allowance (default-to u0 (map-get? allowances {owner: tx-sender, spender: spender})))
    )
    (asserts! (not (var-get contract-paused)) ERR-PAUSED)
    (asserts! (>= current-allowance subtracted-amount) ERR-ALLOWANCE-INSUFFICIENT)
    (map-set allowances {owner: tx-sender, spender: spender} (- current-allowance subtracted-amount))
    (ok true)
  )
)

;; Initialize contract - mint initial supply if needed
;; For example, pre-mint to admin
(begin
  (map-set minters CONTRACT-OWNER true)
)